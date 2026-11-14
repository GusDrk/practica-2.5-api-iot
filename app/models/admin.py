from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Rol(BaseModel):
    id: int
    nombre: str = Field(..., description="ADMINISTRADOR, USUARIO o INVITADO")

class Usuario(BaseModel):
    id: int
    email: str
    rol_id: int
    rol: Optional[str] = None
    activo: bool = True
    creado_en: Optional[datetime] = None

class ModeloVehiculo(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None

class SesionInvitado(BaseModel):
    id: int
    vehiculo_id: int
    token: str
    duracion_segundos: int = 300
    inicio: datetime
    expiracion: datetime
    activo: bool = True

class AuditoriaAdmin(BaseModel):
    id: int
    admin_id: int
    admin_email: Optional[str] = None
    vehiculo_id: int
    accion: str
    detalle: Optional[str] = None
    timestamp: Optional[datetime] = None
