import json
from pathlib import Path
import aiofiles
from models.schemas import StatusResponse


STATUS_DIR = Path("runtime/status")


def _status_path(org_id: str, project_id: str) -> Path:
    safe_org = org_id.replace("/", "_")
    safe_project = project_id.replace("/", "_")
    return STATUS_DIR / f"{safe_org}__{safe_project}.json"


async def write_status(org_id: str, data: StatusResponse) -> None:
    STATUS_DIR.mkdir(parents=True, exist_ok=True)
    target = _status_path(org_id, data.project_id)
    async with aiofiles.open(target, "w", encoding="utf-8") as file:
        await file.write(data.model_dump_json())


async def read_status(org_id: str, project_id: str) -> StatusResponse:
    target = _status_path(org_id, project_id)
    async with aiofiles.open(target, "r", encoding="utf-8") as file:
        raw = await file.read()
    payload = json.loads(raw)
    return StatusResponse.model_validate(payload)
