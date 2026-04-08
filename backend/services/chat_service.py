import re
from services.project_store import chunks_file, read_json


def _tokens(value: str) -> set[str]:
    raw = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]{2,}", value.lower())
    stop = {
        "the", "and", "for", "with", "this", "that", "from", "into", "your",
        "what", "where", "when", "which", "have", "has", "was", "were", "are",
        "you", "not", "but", "how", "why", "can", "could", "would", "should",
    }
    return {token for token in raw if token not in stop}


def _score(question_tokens: set[str], chunk: dict) -> float:
    haystack = " ".join(
        [
            str(chunk.get("file_path", "")),
            str(chunk.get("chunk_name", "")),
            str(chunk.get("code_text", "")),
        ]
    ).lower()
    chunk_tokens = _tokens(haystack)
    if not question_tokens or not chunk_tokens:
        return 0.0
    overlap = question_tokens.intersection(chunk_tokens)
    return len(overlap) / (len(question_tokens) ** 0.7)


async def ask_repository(org_id: str, project_id: str, question: str) -> dict:
    chunks = await read_json(chunks_file(org_id, project_id))
    if not chunks:
        raise FileNotFoundError("Project chunks not found")

    query_tokens = _tokens(question)
    ranked = sorted(
        (
            {
                "file_path": str(chunk.get("file_path", "")),
                "chunk_name": str(chunk.get("chunk_name", "")),
                "similarity_score": round(_score(query_tokens, chunk), 4),
                "code_text": str(chunk.get("code_text", "")),
            }
            for chunk in chunks
        ),
        key=lambda item: item["similarity_score"],
        reverse=True,
    )

    top = [item for item in ranked if item["similarity_score"] > 0][:4]
    if not top:
        return {
            "answer": "No strong match was found. Try asking about a file, function, or framework symbol.",
            "references": [],
        }

    bullets = [f"{item['file_path']}::{item['chunk_name']}" for item in top]
    answer = "Most relevant code areas: " + "; ".join(bullets)
    return {
        "answer": answer,
        "references": [
            {
                "file_path": item["file_path"],
                "chunk_name": item["chunk_name"],
                "similarity_score": item["similarity_score"],
            }
            for item in top
        ],
    }
