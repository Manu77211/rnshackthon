from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from models.schemas import DiagnoseRequest, DiagnoseResponse
from services.diagnose_service import diagnose_error

router = APIRouter(tags=["diagnose"])


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(payload: DiagnoseRequest, org_id: str = Depends(get_org_id)) -> DiagnoseResponse:
    try:
        data = await diagnose_error(org_id, payload.project_id, payload.error_text)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project chunks not found") from exc
    return DiagnoseResponse.model_validate(data)
