from pathlib import Path
import json
from services.parser import CODE_EXTENSIONS, discover_files
from services.project_store import chunks_file, source_dir


def _safe_join(root: Path, rel_path: str) -> Path:
    clean = rel_path.replace("\\", "/").strip("/")
    target = (root / clean).resolve()
    if root.resolve() not in target.parents and target != root.resolve():
        raise ValueError("Invalid file path")
    return target


def _language(path: Path) -> str:
    suffix = path.suffix.lower().replace(".", "")
    return suffix or "text"


def _line_count(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return len(text.splitlines())


def _read_chunks(org_id: str, project_id: str) -> list[dict]:
    path = chunks_file(org_id, project_id)
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return []


def _tree_from_chunks(chunks: list[dict]) -> dict:
    per_file: dict[str, dict] = {}
    for chunk in chunks:
        file_path = str(chunk.get("file_path", "")).strip()
        if not file_path:
            continue
        item = per_file.setdefault(
            file_path,
            {
                "file_path": file_path,
                "language": file_path.rsplit(".", 1)[-1] if "." in file_path else "text",
                "line_count": 0,
            },
        )
        lines = str(chunk.get("code_text", "")).splitlines()
        item["line_count"] = max(item["line_count"], len(lines))
    return {"files": sorted(per_file.values(), key=lambda item: item["file_path"])}


def _content_from_chunks(chunks: list[dict], file_path: str) -> dict | None:
    selected = [chunk for chunk in chunks if str(chunk.get("file_path", "")) == file_path]
    if not selected:
        return None
    selected.sort(key=lambda chunk: int(chunk.get("metadata", {}).get("line_start", 0)))
    blocks = [str(chunk.get("code_text", "")) for chunk in selected if str(chunk.get("code_text", "")).strip()]
    merged = "\n\n".join(blocks)
    language = file_path.rsplit(".", 1)[-1] if "." in file_path else "text"
    return {
        "file_path": file_path,
        "language": language,
        "content": merged,
    }


def build_tree(org_id: str, project_id: str) -> dict:
    root = source_dir(org_id, project_id)
    if root.exists():
        files = discover_files(root)
        if files:
            items: list[dict] = []
            for file_path in files:
                rel = str(file_path.relative_to(root)).replace("\\", "/")
                items.append(
                    {
                        "file_path": rel,
                        "language": _language(file_path),
                        "line_count": _line_count(file_path),
                    }
                )
            return {"files": sorted(items, key=lambda item: item["file_path"])}
    chunks = _read_chunks(org_id, project_id)
    if not chunks:
        raise FileNotFoundError("Project source not found")
    return _tree_from_chunks(chunks)


def read_source_file(org_id: str, project_id: str, file_path: str) -> dict:
    root = source_dir(org_id, project_id)
    if root.exists():
        target = _safe_join(root, file_path)
        if target.exists() and target.is_file():
            if target.suffix.lower() not in CODE_EXTENSIONS:
                raise ValueError("Unsupported file type")
            content = target.read_text(encoding="utf-8", errors="ignore")
            return {
                "file_path": str(target.relative_to(root)).replace("\\", "/"),
                "language": _language(target),
                "content": content,
            }

    chunks = _read_chunks(org_id, project_id)
    fallback = _content_from_chunks(chunks, file_path)
    if fallback:
        return fallback
    raise FileNotFoundError("Source file not found")
