import re
from typing import Any
from services.project_store import chunks_file, read_json


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[A-Za-z_][A-Za-z0-9_]+", text.lower()))


def _path_hints(error_text: str) -> set[str]:
    hints = set(re.findall(r"([A-Za-z0-9_./\\-]+\.(?:py|ts|tsx|js|jsx))", error_text))
    return {item.replace("\\", "/") for item in hints}


def _score(query: set[str], chunk_text: str) -> float:
    target = _tokens(chunk_text)
    if not query or not target:
        return 0.0
    overlap = len(query.intersection(target))
    return overlap / max(len(query), 1)


async def diagnose_error(org_id: str, project_id: str, error_text: str) -> dict[str, Any]:
    chunks = await read_json(chunks_file(org_id, project_id))
    query_tokens = _tokens(error_text)
    hints = _path_hints(error_text)
    ranked: list[dict[str, Any]] = []
    for chunk in chunks:
        base = _score(query_tokens, chunk.get("code_text", ""))
        file_path = chunk.get("file_path", "")
        boost = 0.3 if any(hint in file_path for hint in hints) else 0.0
        similarity = min(base + boost, 1.0)
        ranked.append(
            {
                "file_path": file_path,
                "chunk_name": chunk.get("chunk_name", "unknown"),
                "chunk_type": chunk.get("chunk_type", "file"),
                "code_text": chunk.get("code_text", ""),
                "similarity_score": round(similarity, 4),
                "reason": "Semantic token overlap with error context",
            }
        )
    results = sorted(ranked, key=lambda item: item["similarity_score"], reverse=True)[:5]
    return {"results": results}
