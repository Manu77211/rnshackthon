from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from models.schemas import SimilarityRequest, SimilarityResponse
from services.similarity_service import find_similar_functions

router = APIRouter(tags=["similarity"])


@router.post("/similarity", response_model=SimilarityResponse)
async def similarity(
    payload: SimilarityRequest,
    org_id: str = Depends(get_org_id),
) -> SimilarityResponse:
    try:
        data = await find_similar_functions(
            org_id,
            payload.project_id,
            payload.code_text,
            payload.limit,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project chunks not found") from exc
    return SimilarityResponse.model_validate(data)
