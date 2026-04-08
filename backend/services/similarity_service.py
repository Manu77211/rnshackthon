import re
from typing import Any
from services.project_store import chunks_file, read_json


def _tokens(text: str) -> set[str]:
    values = re.findall(r"[A-Za-z_][A-Za-z0-9_]+", text.lower())
    return set(values)


def _score(query: set[str], target_text: str) -> float:
    target = _tokens(target_text)
    if not query or not target:
        return 0.0
    overlap = len(query.intersection(target))
    return overlap / max(len(query), 1)


async def find_similar_functions(
    org_id: str,
    project_id: str,
    code_text: str,
    limit: int,
) -> dict[str, Any]:
    chunks = await read_json(chunks_file(org_id, project_id))
    query = _tokens(code_text)
    ranked: list[dict[str, Any]] = []

    for chunk in chunks:
        if chunk.get("chunk_type") != "function":
            continue
        score = _score(query, str(chunk.get("code_text", "")))
        ranked.append(
            {
                "file_path": str(chunk.get("file_path", "")),
                "chunk_name": str(chunk.get("chunk_name", "unknown")),
                "chunk_type": "function",
                "similarity_score": round(score, 4),
                "code_text": str(chunk.get("code_text", ""))[:1200],
            }
        )

    top = sorted(ranked, key=lambda item: item["similarity_score"], reverse=True)
    return {
        "embedding_backend": "token-overlap-v1",
        "results": top[: max(1, min(limit, 10))],
    }
