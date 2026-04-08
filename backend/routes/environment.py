from fastapi import APIRouter, Depends
from dependencies.auth import get_org_id
from models.schemas import EnvironmentScanResponse
from services.environment_service import scan_environment

router = APIRouter(tags=["environment"])


@router.get("/scan-environment", response_model=EnvironmentScanResponse)
async def scan_environment_route(_: str = Depends(get_org_id)) -> EnvironmentScanResponse:
    payload = await scan_environment()
    return EnvironmentScanResponse.model_validate(payload)