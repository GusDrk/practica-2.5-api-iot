import os
from typing import Dict, Any
import openai
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

# Cargar la API key desde .env (python-dotenv ya configurado en el proyecto)
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise RuntimeError("OPENAI_API_KEY no está configurada en .env")

class ChatMessage(BaseModel):
    role: str = Field(..., description="role – 'system', 'user' or 'assistant'")
    content: str = Field(..., description="texto del mensaje")

class ChatRequest(BaseModel):
    model: str = Field(default="gpt-4o-mini", description="modelo OpenAI a usar")
    messages: list[ChatMessage]

def call_openai_chat(req: ChatRequest) -> Dict[str, Any]:
    """Llamada síncrona a la API de chat de OpenAI.
    Captura errores y los transforma a HTTPException para que FastAPI los
    devuelva al cliente con un mensaje claro.
    """
    try:
        response = openai.chat.completions.create(
            model=req.model,
            messages=[msg.dict() for msg in req.messages],
            stream=False,
        )
        return response.to_dict()
    except openai.APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error de OpenAI: {exc.message}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
