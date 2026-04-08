import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from dependencies.auth import get_org_id
from models.schemas import StatusResponse
from services.status_store import read_status

router = APIRouter(tags=["status"])


@router.get("/status/{project_id}", response_model=StatusResponse)
async def get_status(project_id: str, org_id: str = Depends(get_org_id)) -> StatusResponse:
    try:
        return await read_status(org_id, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project status not found") from exc


async def _stream(project_id: str, org_id: str):
    try:
        while True:
            try:
                status = await read_status(org_id, project_id)
                yield f"data: {status.model_dump_json()}\n\n"
                if status.progress >= 100:
                    break
            except FileNotFoundError:
                yield "data: {\"project_id\":\"\",\"status\":\"queued\",\"progress\":0}\n\n"
            await asyncio.sleep(1)
    except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError):
        return


@router.get("/status/{project_id}/stream")
async def stream_status(project_id: str, org_id: str = Depends(get_org_id)) -> StreamingResponse:
    return StreamingResponse(_stream(project_id, org_id), media_type="text/event-stream")
