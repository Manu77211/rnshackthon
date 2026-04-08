from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth import get_org_id
from models.schemas import AnalyzeRepoResponse
from services.analyze_service import analyze_repo

router = APIRouter(tags=["analyze"])


async def _analyze_payload(org_id: str, project_id: str) -> AnalyzeRepoResponse:
    try:
        payload = await analyze_repo(org_id, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project graph not found") from exc
    return AnalyzeRepoResponse.model_validate(payload)


@router.get("/analyze-repo/{project_id}", response_model=AnalyzeRepoResponse)
async def analyze(project_id: str, org_id: str = Depends(get_org_id)) -> AnalyzeRepoResponse:
    return await _analyze_payload(org_id, project_id)


@router.get("/analyze-repo", response_model=AnalyzeRepoResponse)
async def analyze_query(project_id: str, org_id: str = Depends(get_org_id)) -> AnalyzeRepoResponse:
    return await _analyze_payload(org_id, project_id)