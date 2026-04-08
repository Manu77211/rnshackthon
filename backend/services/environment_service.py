import json
import platform
import re
import shutil
import subprocess
from importlib import metadata
from pathlib import Path
from typing import Any


def _workspace_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _safe_run(command: list[str], cwd: Path | None = None) -> str:
    try:
        result = subprocess.run(
            command,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return "not installed"
    if result.returncode != 0:
        return "not installed"
    return result.stdout.strip() or "not installed"


def _to_gb(value: int) -> float:
    return round(value / (1024**3), 2)


def _ram_gb() -> float | None:
    try:
        import psutil  # type: ignore

        return _to_gb(int(psutil.virtual_memory().total))
    except Exception:
        return None


def _system_info(root: Path) -> dict[str, Any]:
    total, _, free = shutil.disk_usage(root)
    return {
        "os": f"{platform.system()} {platform.release()}",
        "python_version": platform.python_version(),
        "node_version": _safe_run(["node", "--version"]),
        "git_version": _safe_run(["git", "--version"]),
        "ram_gb": _ram_gb(),
        "disk_total_gb": _to_gb(total),
        "disk_free_gb": _to_gb(free),
    }


def _normalize_name(name: str) -> str:
    return re.split(r"[<>=!~\[]", name.strip(), maxsplit=1)[0].lower().replace("_", "-")


def _required_python(path: Path) -> set[str]:
    if not path.exists():
        return set()
    required: set[str] = set()
    for row in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = row.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(("-r", "--")):
            continue
        required.add(_normalize_name(line))
    return required


def _installed_python() -> set[str]:
    values: set[str] = set()
    for dist in metadata.distributions():
        name = dist.metadata.get("Name")
        if name:
            values.add(str(name).lower().replace("_", "-"))
    return values


def _required_node(path: Path) -> set[str]:
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    dependencies = payload.get("dependencies", {})
    dev_dependencies = payload.get("devDependencies", {})
    names = list(dependencies.keys()) + list(dev_dependencies.keys())
    return {str(item).lower() for item in names}


def _installed_node_from_modules(frontend_dir: Path) -> set[str]:
    node_modules = frontend_dir / "node_modules"
    if not node_modules.exists():
        return set()
    installed: set[str] = set()
    for entry in node_modules.iterdir():
        if not entry.is_dir() or entry.name == ".bin":
            continue
        if entry.name.startswith("@"):
            for scoped in entry.iterdir():
                if scoped.is_dir():
                    installed.add(f"{entry.name}/{scoped.name}".lower())
            continue
        installed.add(entry.name.lower())
    return installed


def _installed_node(frontend_dir: Path) -> set[str]:
    if not frontend_dir.exists():
        return set()
    try:
        result = subprocess.run(
            ["npm", "ls", "--depth=0", "--json"],
            cwd=str(frontend_dir),
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return _installed_node_from_modules(frontend_dir)
    if not result.stdout.strip():
        return _installed_node_from_modules(frontend_dir)
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return _installed_node_from_modules(frontend_dir)
    names = {str(name).lower() for name in payload.get("dependencies", {}).keys()}
    if names:
        return names
    return _installed_node_from_modules(frontend_dir)


def _calculate_health_score(issue_count: int) -> int:
    return max(0, 100 - issue_count * 10)


async def scan_environment() -> dict[str, Any]:
    root = _workspace_root()
    backend_dir = root / "backend"
    frontend_dir = root / "frontend"

    required_py = _required_python(backend_dir / "requirements.txt")
    installed_py = _installed_python()
    missing_python = sorted(required_py - installed_py)

    required_node = _required_node(frontend_dir / "package.json")
    installed_node = _installed_node(frontend_dir)
    missing_node = sorted(required_node - installed_node)

    system = _system_info(root)
    tool_issues = 0
    if system["node_version"] == "not installed":
        tool_issues += 1
    if system["git_version"] == "not installed":
        tool_issues += 1

    issues_count = len(missing_python) + len(missing_node) + tool_issues
    return {
        "health_score": _calculate_health_score(issues_count),
        "issues_count": issues_count,
        "system": system,
        "dependencies": {
            "missing_python": missing_python,
            "missing_node": missing_node,
        },
    }