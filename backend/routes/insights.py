from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from models.schemas import InsightRequest, InsightResponse
from services.insights_service import generate_insights

router = APIRouter(tags=["insights"])


@router.post("/insights", response_model=InsightResponse)
async def insights(
    payload: InsightRequest,
    org_id: str = Depends(get_org_id),
) -> InsightResponse:
    try:
        data = await generate_insights(
            org_id,
            payload.project_id,
            payload.error_text,
            payload.top_k,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project chunks not found") from exc
    return InsightResponse.model_validate(data)
