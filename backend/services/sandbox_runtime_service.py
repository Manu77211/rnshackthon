import asyncio
import subprocess
import time
from pathlib import Path
from typing import Any

from services.diagnose_service import diagnose_error
from services.insights_service import generate_insights
from services.project_store import source_dir


_BLOCKED_TERMS = {
    "shutdown",
    "format ",
    "del /s",
    "rm -rf /",
    "rmdir /s /q c:\\",
}


def _safe_log(value: str, max_chars: int = 14000) -> str:
    text = (value or "").strip()
    if len(text) <= max_chars:
        return text
    head = text[: max_chars // 2]
    tail = text[-(max_chars // 2) :]
    return f"{head}\n...<truncated>...\n{tail}"


def _resolve_default_command(root: Path) -> tuple[str, str]:
    if (root / "package.json").exists():
        return "node", "npm run build"
    if (root / "pytest.ini").exists() or (root / "tests").exists():
        return "python", "python -m pytest -q"
    if (root / "requirements.txt").exists() or (root / "pyproject.toml").exists():
        return "python", "python -m compileall ."
    return "generic", "git status"


def _validate_command(command: str) -> None:
    lowered = command.lower()
    if any(term in lowered for term in _BLOCKED_TERMS):
        raise ValueError("Unsafe command blocked for sandbox execution")


def _execute_sync(command: str, cwd: Path, timeout_sec: int) -> dict[str, Any]:
    start = time.perf_counter()
    timed_out = False
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            shell=True,
            capture_output=True,
            timeout=timeout_sec,
            check=False,
        )
        code = int(completed.returncode)
        stdout = completed.stdout.decode("utf-8", errors="ignore")
        stderr = completed.stderr.decode("utf-8", errors="ignore")
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        code = 124
        stdout = (exc.stdout or b"").decode("utf-8", errors="ignore")
        stderr = (exc.stderr or b"").decode("utf-8", errors="ignore")
    duration_ms = int((time.perf_counter() - start) * 1000)
    return {
        "exit_code": code,
        "timed_out": timed_out,
        "duration_ms": duration_ms,
        "stdout": _safe_log(stdout),
        "stderr": _safe_log(stderr),
    }


async def _execute(command: str, cwd: Path, timeout_sec: int) -> dict[str, Any]:
    return await asyncio.to_thread(_execute_sync, command, cwd, timeout_sec)


def _insight_payload(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not data:
        return None
    return {
        "summary": str(data.get("summary", "")),
        "probable_root_cause": str(data.get("probable_root_cause", "")),
        "action_items": [str(item) for item in data.get("action_items", [])[:3]],
        "provider": str(data.get("provider", "fallback-template")),
    }


async def run_project_check(
    org_id: str,
    project_id: str,
    command: str | None,
    timeout_sec: int,
    include_ai_insights: bool,
) -> dict[str, Any]:
    root = source_dir(org_id, project_id)
    if not root.exists():
        raise FileNotFoundError("Project source not found")

    profile, default_command = _resolve_default_command(root)
    selected = (command or default_command).strip()
    if not selected:
        raise ValueError("Command cannot be empty")
    _validate_command(selected)

    execution = await _execute(selected, root, timeout_sec)
    logs = "\n".join([execution.get("stderr", ""), execution.get("stdout", "")]).strip()

    diagnosis: list[dict[str, Any]] = []
    insights: dict[str, Any] | None = None
    if execution["exit_code"] != 0 and logs:
        try:
            diagnosed = await diagnose_error(org_id, project_id, logs)
            diagnosis = [item for item in diagnosed.get("results", [])[:5] if isinstance(item, dict)]
        except FileNotFoundError:
            diagnosis = []
        if include_ai_insights:
            try:
                insight_data = await generate_insights(org_id, project_id, logs, top_k=3)
                insights = _insight_payload(insight_data)
            except FileNotFoundError:
                insights = None

    return {
        "project_id": project_id,
        "profile": profile,
        "command": selected,
        "exit_code": int(execution["exit_code"]),
        "timed_out": bool(execution["timed_out"]),
        "duration_ms": int(execution["duration_ms"]),
        "stdout": str(execution["stdout"]),
        "stderr": str(execution["stderr"]),
        "diagnosis": diagnosis,
        "insights": insights,
    }
