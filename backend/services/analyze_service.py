from typing import Any

from services.project_store import project_file, read_json


async def analyze_repo(org_id: str, project_id: str) -> dict[str, Any]:
    path = project_file(org_id, project_id)
    payload = await read_json(path)
    if not isinstance(payload, dict):
        raise FileNotFoundError("Project graph not found")
    return payload