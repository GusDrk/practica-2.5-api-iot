from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from app.database.mysql import Database
from app.services.admin_service import AdminService
from app.schemas.admin_requests import (
    UsuarioCrear, UsuarioActualizar, LoginRequest,
    SoporteToggleRequest, InvitadoReservaRequest
)

def build_admin_router(db: Database) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["Administración"])
    service = AdminService(db)

    @router.get("/usuarios", summary="Obtener lista de usuarios registrados")
    def get_usuarios():
        try:
            return service.obtener_usuarios()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener usuarios: {str(e)}")

    @router.post("/usuarios", status_code=status.HTTP_201_CREATED, summary="Crear un nuevo usuario con rol")
    def crear_usuario(payload: UsuarioCrear):
        try:
            existente = service.obtener_usuario_por_email(payload.email)
            if existente:
                raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado.")
            return service.crear_usuario(payload.email, payload.password, payload.rol_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear usuario: {str(e)}")

    @router.put("/usuarios/{id_usuario}", summary="Actualizar usuario")
    def actualizar_usuario(id_usuario: int, payload: UsuarioActualizar):
        try:
            return service.actualizar_usuario(
                id_usuario,
                email=payload.email,
                password=payload.password,
                rol_id=payload.rol_id,
                activo=payload.activo
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al actualizar usuario: {str(e)}")

    @router.post("/login", summary="Autenticación de usuario por credenciales")
    def login(payload: LoginRequest):
        user = service.autenticar(payload.email, payload.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas o usuario inactivo."
            )
        return {
            "autenticado": True,
            "usuario": user,
            "token": f"sess_{user['id']}_{user['rol_id']}"
        }

    @router.post("/soporte/toggle", summary="Interruptor de soporte administrativo sobre un vehículo")
    def toggle_soporte(payload: SoporteToggleRequest):
        try:
            admin_id = 1
            return service.registrar_soporte(
                admin_id=admin_id,
                vehiculo_id=payload.vehiculo_id,
                habilitado=payload.habilitado,
                motivo=payload.motivo or "Intervención autorizada"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al alternar soporte: {str(e)}")

    @router.get("/auditoria", summary="Consultar log de auditoría administrativa")
    def get_auditoria():
        try:
            return service.obtener_auditoria()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener auditoría: {str(e)}")

    @router.post("/invitado/sesion", summary="Generar sesión de prueba de invitado (5 min)")
    def crear_sesion_invitado(payload: InvitadoReservaRequest):
        try:
            return service.crear_sesion_invitado(
                vehiculo_id=payload.vehiculo_id,
                duracion_segundos=payload.duracion_segundos
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear sesión de invitado: {str(e)}")

    return router
