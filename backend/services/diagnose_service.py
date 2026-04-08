import re
from typing import Any
from services.embedding_service import rank_chunks
from services.project_store import chunks_file, read_json


def _path_hints(error_text: str) -> set[str]:
    hints = set(re.findall(r"([A-Za-z0-9_./\\-]+\.(?:py|ts|tsx|js|jsx))", error_text))
    return {item.replace("\\", "/") for item in hints}


async def diagnose_error(org_id: str, project_id: str, error_text: str) -> dict[str, Any]:
    chunks = await read_json(chunks_file(org_id, project_id))
    hints = _path_hints(error_text)
    _, results = await rank_chunks(
        chunks,
        error_text,
        5,
        allowed_types={"function", "class", "file"},
        path_hints=hints,
    )
    return {"results": results}
