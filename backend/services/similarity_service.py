from typing import Any
from services.embedding_service import rank_chunks
from services.project_store import chunks_file, read_json


async def find_similar_functions(
    org_id: str,
    project_id: str,
    code_text: str,
    limit: int,
) -> dict[str, Any]:
    chunks = await read_json(chunks_file(org_id, project_id))
    backend, ranked = await rank_chunks(
        [item for item in chunks if item.get("chunk_type") == "function"],
        code_text,
        limit,
        allowed_types={"function"},
    )
    return {
        "embedding_backend": backend,
        "results": [
            {
                "file_path": item["file_path"],
                "chunk_name": item["chunk_name"],
                "chunk_type": item["chunk_type"],
                "similarity_score": item["similarity_score"],
                "code_text": item["code_text"][:1200],
            }
            for item in ranked
        ],
    }
