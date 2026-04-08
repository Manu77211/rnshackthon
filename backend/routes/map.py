from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from services.map_service import build_map

router = APIRouter(tags=["map"])


@router.get("/map/{project_id}")
async def get_map(project_id: str, org_id: str = Depends(get_org_id)) -> dict:
    try:
        return await build_map(org_id, project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project map not found") from exc
