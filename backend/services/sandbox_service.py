import difflib
from datetime import datetime, timezone
from pathlib import Path
from services.explorer_service import read_source_file
from services.project_store import fix_dir, read_json, source_dir, write_json


def _snapshot_path(base: Path, snapshot_id: str) -> Path:
    return base / f"{snapshot_id}.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _preview_diff(before: str, after: str) -> str:
    lines = difflib.unified_diff(
        before.splitlines(),
        after.splitlines(),
        fromfile="before",
        tofile="after",
        n=2,
        lineterm="",
    )
    return "\n".join(list(lines)[:120])


async def save_fix_snapshot(
    org_id: str,
    project_id: str,
    file_path: str,
    updated_content: str,
    note: str,
) -> dict:
    source = read_source_file(org_id, project_id, file_path)
    before = source["content"]
    snapshot_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    payload = {
        "snapshot_id": snapshot_id,
        "project_id": project_id,
        "file_path": source["file_path"],
        "language": source["language"],
        "created_at": _utc_now(),
        "note": note,
        "before": before,
        "after": updated_content,
        "diff_preview": _preview_diff(before, updated_content),
    }
    folder = fix_dir(org_id, project_id)
    await write_json(_snapshot_path(folder, snapshot_id), payload)
    return {
        "snapshot_id": snapshot_id,
        "file_path": source["file_path"],
        "created_at": payload["created_at"],
        "note": note,
    }


async def list_fix_snapshots(org_id: str, project_id: str) -> dict:
    folder = fix_dir(org_id, project_id)
    if not folder.exists():
        return {"items": []}
    items: list[dict] = []
    for file_path in sorted(folder.glob("*.json"), reverse=True):
        raw = await read_json(file_path)
        items.append(
            {
                "snapshot_id": raw.get("snapshot_id", ""),
                "file_path": raw.get("file_path", ""),
                "created_at": raw.get("created_at", ""),
                "note": raw.get("note", ""),
            }
        )
    return {"items": items}


async def get_fix_snapshot(org_id: str, project_id: str, snapshot_id: str) -> dict:
    root = source_dir(org_id, project_id)
    if not root.exists():
        raise FileNotFoundError("Project source not found")
    snapshot = _snapshot_path(fix_dir(org_id, project_id), snapshot_id)
    if not snapshot.exists():
        raise FileNotFoundError("Snapshot not found")
    raw = await read_json(snapshot)
    return {
        "snapshot_id": raw.get("snapshot_id", ""),
        "file_path": raw.get("file_path", ""),
        "language": raw.get("language", "text"),
        "created_at": raw.get("created_at", ""),
        "note": raw.get("note", ""),
        "before": raw.get("before", ""),
        "after": raw.get("after", ""),
        "diff_preview": raw.get("diff_preview", ""),
    }
