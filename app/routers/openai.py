from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List

from app.services.openai_service import ChatRequest, call_openai_chat

router = APIRouter(prefix="/openai", tags=["OpenAI"])

@router.post("/chat", summary="Chat con modelo OpenAI", response_model=dict)
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La lista de mensajes no puede estar vacía.")
    return call_openai_chat(request)
