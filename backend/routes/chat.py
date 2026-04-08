from fastapi import APIRouter, Depends, HTTPException
from dependencies.auth import get_org_id
from models.schemas import ChatRequest, ChatResponse
from services.chat_service import ask_repository

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, org_id: str = Depends(get_org_id)) -> ChatResponse:
    try:
        data = await ask_repository(org_id, payload.project_id, payload.question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project chunks not found") from exc
    return ChatResponse.model_validate(data)
