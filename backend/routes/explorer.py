import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from dependencies.auth import get_org_id
from models.schemas import ExplorerFileResponse, ExplorerTreeResponse
from services.explorer_service import build_tree, read_source_file

router = APIRouter(tags=["explorer"])


@router.get("/explorer/{project_id}/tree", response_model=ExplorerTreeResponse)
async def explorer_tree(project_id: str, org_id: str = Depends(get_org_id)) -> ExplorerTreeResponse:
    try:
        data = await asyncio.to_thread(build_tree, org_id, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project source not found") from exc
    return ExplorerTreeResponse.model_validate(data)


@router.get("/explorer/{project_id}/file", response_model=ExplorerFileResponse)
async def explorer_file(
    project_id: str,
    file_path: str = Query(min_length=1),
    org_id: str = Depends(get_org_id),
) -> ExplorerFileResponse:
    try:
        data = await asyncio.to_thread(read_source_file, org_id, project_id, file_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Source file not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ExplorerFileResponse.model_validate(data)
