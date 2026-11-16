from pydantic import BaseModel, Field
from typing import Optional

class UsuarioCrear(BaseModel):
    email: str = Field(..., description="Nombre de usuario o correo")
    password: str = Field(..., min_length=6, description="Contraseña en texto plano")
    rol_id: int = Field(default=2, description="1: ADMIN, 2: USUARIO, 3: INVITADO")

class UsuarioActualizar(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    rol_id: Optional[int] = None
    activo: Optional[bool] = None

class LoginRequest(BaseModel):
    email: str = Field(..., description="Nombre de usuario o correo")
    password: str
    guest_token: Optional[str] = Field(
        default=None,
        description="Token temporal obligatorio para el acceso de invitado"
    )


class InvitadoAccesoRequest(BaseModel):
    """Token de un enlace QR para iniciar la sesión temporal de invitado."""
    token: str = Field(..., min_length=1)

class SoporteToggleRequest(BaseModel):
    vehiculo_id: int
    habilitado: bool
    motivo: Optional[str] = "Intervención de soporte administrativo autorizada"

class InvitadoReservaRequest(BaseModel):
    vehiculo_id: int = Field(default=1, description="ID del vehículo a compartir")
    duracion_segundos: int = Field(default=45, description="Duración en segundos (45s)")

class ModeloCrear(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class ModeloActualizar(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class UnidadCrear(BaseModel):
    id_vehiculo: Optional[int] = None
    nombre: str
    modelo: Optional[str] = None
    descripcion: Optional[str] = None
    microcontrolador: Optional[str] = "ESP8266"
    usuario_id: Optional[int] = None

class AsignarVehiculoRequest(BaseModel):
    usuario_id: Optional[int] = None

class DemoUsuarioCrear(BaseModel):
    id_vehiculo: int
    nombre: str
    descripcion: Optional[str] = None
    usuario_id: Optional[int] = None
    es_fabrica: bool = False
