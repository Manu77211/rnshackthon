from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth import get_org_id
from models.schemas import PRReviewRequest, PRReviewResponse
from services.pr_review_service import analyze_pull_request

router = APIRouter(tags=["pr-review"])


@router.post("/pr-review", response_model=PRReviewResponse)
async def pr_review(
    payload: PRReviewRequest,
    org_id: str = Depends(get_org_id),
) -> PRReviewResponse:
    try:
        data = await analyze_pull_request(
            org_id=org_id,
            project_id=payload.project_id,
            pr_url=payload.pr_url,
            include_ai=payload.include_ai,
            max_findings=payload.max_findings,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project data not found. Ingest repository first.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PRReviewResponse.model_validate(data)
