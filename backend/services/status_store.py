import json
from pathlib import Path
from uuid import uuid4
import aiofiles
from pydantic import ValidationError
from models.schemas import StatusResponse


STATUS_DIR = Path("runtime/status")


def _status_path(org_id: str, project_id: str) -> Path:
    safe_org = org_id.replace("/", "_")
    safe_project = project_id.replace("/", "_")
    return STATUS_DIR / f"{safe_org}__{safe_project}.json"


def _default_status(project_id: str) -> StatusResponse:
    return StatusResponse(project_id=project_id, status="queued", progress=0)


async def write_status(org_id: str, data: StatusResponse) -> None:
    STATUS_DIR.mkdir(parents=True, exist_ok=True)
    target = _status_path(org_id, data.project_id)
    temp_target = target.with_name(f"{target.name}.{uuid4().hex}.tmp")
    async with aiofiles.open(temp_target, "w", encoding="utf-8") as file:
        await file.write(data.model_dump_json())
        await file.flush()
    temp_target.replace(target)


async def read_status(org_id: str, project_id: str) -> StatusResponse:
    target = _status_path(org_id, project_id)
    if not target.exists():
        raise FileNotFoundError(target)
    async with aiofiles.open(target, "r", encoding="utf-8") as file:
        raw = await file.read()
    if not raw.strip():
        return _default_status(project_id)
    try:
        payload = json.loads(raw)
        return StatusResponse.model_validate(payload)
    except (json.JSONDecodeError, ValidationError):
        return _default_status(project_id)
