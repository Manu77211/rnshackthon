from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth import get_org_id
from models.schemas import GitSummaryResponse
from services.git_history_service import summarize_git_history

router = APIRouter(tags=["git"])


async def _summary_payload(org_id: str, project_id: str) -> GitSummaryResponse:
    try:
        payload = await summarize_git_history(org_id, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project git history not found") from exc
    return GitSummaryResponse.model_validate(payload)


@router.get("/git-summary/{project_id}", response_model=GitSummaryResponse)
async def git_summary(project_id: str, org_id: str = Depends(get_org_id)) -> GitSummaryResponse:
    return await _summary_payload(org_id, project_id)


@router.get("/git-summary", response_model=GitSummaryResponse)
async def git_summary_query(project_id: str, org_id: str = Depends(get_org_id)) -> GitSummaryResponse:
    return await _summary_payload(org_id, project_id)