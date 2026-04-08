from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from models.schemas import (
    SandboxFixDetailResponse,
    SandboxFixListResponse,
    SandboxFixRequest,
    SandboxFixSummary,
)
from services.sandbox_service import get_fix_snapshot, list_fix_snapshots, save_fix_snapshot

router = APIRouter(tags=["sandbox"])


@router.post("/sandbox/fix", response_model=SandboxFixSummary)
async def save_fix(payload: SandboxFixRequest, org_id: str = Depends(get_org_id)) -> SandboxFixSummary:
    try:
        data = await save_fix_snapshot(
            org_id,
            payload.project_id,
            payload.file_path,
            payload.updated_content,
            payload.note,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Source file not found") from exc
    return SandboxFixSummary.model_validate(data)


@router.get("/sandbox/{project_id}/fixes", response_model=SandboxFixListResponse)
async def list_fixes(project_id: str, org_id: str = Depends(get_org_id)) -> SandboxFixListResponse:
    data = await list_fix_snapshots(org_id, project_id)
    return SandboxFixListResponse.model_validate(data)


@router.get("/sandbox/{project_id}/fixes/{snapshot_id}", response_model=SandboxFixDetailResponse)
async def fix_detail(
    project_id: str,
    snapshot_id: str,
    org_id: str = Depends(get_org_id),
) -> SandboxFixDetailResponse:
    try:
        data = await get_fix_snapshot(org_id, project_id, snapshot_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Snapshot not found") from exc
    return SandboxFixDetailResponse.model_validate(data)
