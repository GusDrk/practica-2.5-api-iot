from pydantic import BaseModel, Field
from typing import Optional

class UsuarioCrear(BaseModel):
    email: str = Field(..., description="Correo del usuario")
    password: str = Field(..., min_length=6, description="Contraseña en texto plano")
    rol_id: int = Field(default=2, description="1: ADMIN, 2: USUARIO, 3: INVITADO")

class UsuarioActualizar(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    rol_id: Optional[int] = None
    activo: Optional[bool] = None

class LoginRequest(BaseModel):
    email: str = Field(..., description="Correo del usuario")
    password: str

class SoporteToggleRequest(BaseModel):
    vehiculo_id: int
    habilitado: bool
    motivo: Optional[str] = "Intervención de soporte administrativo autorizada"

class InvitadoReservaRequest(BaseModel):
    vehiculo_id: int
    duracion_segundos: int = Field(default=300, description="Duración en segundos (5 minutos = 300s)")
