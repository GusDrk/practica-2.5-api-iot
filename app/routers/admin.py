from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from app.database.mysql import Database
from app.services.admin_service import AdminService
from app.schemas.admin_requests import (
    UsuarioCrear, UsuarioActualizar, LoginRequest,
    SoporteToggleRequest, InvitadoReservaRequest,
    ModeloCrear, ModeloActualizar, UnidadCrear, AsignarVehiculoRequest,
    DemoUsuarioCrear
)

def build_admin_router(db: Database) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["Administración & RBAC"])
    service = AdminService(db)

    # ─────────────────────────────────────────────────────────────
    # AUTENTICACIÓN Y USUARIOS
    # ─────────────────────────────────────────────────────────────
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

    @router.get("/usuarios", summary="Obtener lista de usuarios registrados")
    def get_usuarios():
        try:
            return service.obtener_usuarios()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener usuarios: {str(e)}")

    @router.post("/usuarios", status_code=status.HTTP_201_CREATED, summary="Crear un nuevo usuario")
    def crear_usuario(payload: UsuarioCrear):
        try:
            existente = service.obtener_usuario_por_email(payload.email)
            if existente:
                raise HTTPException(status_code=400, detail="El nombre de usuario ya se encuentra registrado.")
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

    # ─────────────────────────────────────────────────────────────
    # MODELOS DE VEHÍCULOS (ADMIN)
    # ─────────────────────────────────────────────────────────────
    @router.get("/modelos", summary="Consultar catálogo de modelos de vehículos")
    def get_modelos():
        try:
            return service.obtener_modelos()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener modelos: {str(e)}")

    @router.post("/modelos", status_code=status.HTTP_201_CREATED, summary="Registrar nuevo modelo comercial")
    def crear_modelo(payload: ModeloCrear):
        try:
            return service.crear_modelo(payload.nombre, payload.descripcion)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear modelo: {str(e)}")

    @router.put("/modelos/{id_modelo}", summary="Editar modelo comercial")
    def editar_modelo(id_modelo: int, payload: ModeloActualizar):
        try:
            return service.actualizar_modelo(id_modelo, payload.nombre, payload.descripcion)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al editar modelo: {str(e)}")

    # ─────────────────────────────────────────────────────────────
    # UNIDADES FÍSICAS E INVENTARIO (ADMIN)
    # ─────────────────────────────────────────────────────────────
    @router.get("/inventario", summary="Consultar inventario de vehículos físicos")
    def get_inventario():
        try:
            return service.obtener_inventario()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener inventario: {str(e)}")

    @router.post("/unidades", status_code=status.HTTP_201_CREATED, summary="Registrar unidad física de vehículo")
    def crear_unidad(payload: UnidadCrear):
        try:
            return service.crear_unidad(
                id_vehiculo=payload.id_vehiculo,
                nombre=payload.nombre,
                modelo=payload.modelo,
                descripcion=payload.descripcion,
                microcontrolador=payload.microcontrolador,
                usuario_id=payload.usuario_id
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al registrar unidad: {str(e)}")

    @router.put("/unidades/{id_vehiculo}/asignar", summary="Asignar o reasignar vehículo a un cliente")
    def asignar_vehiculo(id_vehiculo: int, payload: AsignarVehiculoRequest):
        try:
            return service.asignar_vehiculo(id_vehiculo, payload.usuario_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al asignar vehículo: {str(e)}")

    # ─────────────────────────────────────────────────────────────
    # CLIENTES Y DASHBOARD (ADMIN)
    # ─────────────────────────────────────────────────────────────
    @router.get("/clientes", summary="Consultar lista de clientes registrados")
    def get_clientes():
        try:
            return service.obtener_clientes()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener clientes: {str(e)}")

    @router.get("/dashboard/stats", summary="Estadísticas generales para el dashboard de administración")
    def get_dashboard_stats():
        try:
            return service.obtener_estadisticas()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

    # ─────────────────────────────────────────────────────────────
    # DEMOSTRACIONES DE FÁBRICA (ADMIN)
    # ─────────────────────────────────────────────────────────────
    @router.get("/demos-fabrica", summary="Consultar demostraciones de fábrica")
    def get_demos_fabrica():
        try:
            return service.obtener_demos_fabrica()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener demos de fábrica: {str(e)}")

    @router.post("/demos-fabrica", status_code=status.HTTP_201_CREATED, summary="Crear demostración de fábrica")
    def crear_demo_fabrica(payload: DemoUsuarioCrear):
        try:
            return service.crear_demo_fabrica(payload.id_vehiculo, payload.nombre, payload.descripcion)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear demo de fábrica: {str(e)}")

    # ─────────────────────────────────────────────────────────────
    # VISTA USUARIO (COMPRADOR)
    # ─────────────────────────────────────────────────────────────
    @router.get("/mis-vehiculos", summary="Consultar únicamente los vehículos asignados al comprador")
    def get_mis_vehiculos(usuario_id: int = Query(..., description="ID del usuario logueado")):
        try:
            return service.obtener_mis_vehiculos(usuario_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener mis vehículos: {str(e)}")

    @router.get("/mis-demos", summary="Consultar demostraciones del usuario y de fábrica")
    def get_mis_demos(usuario_id: int = Query(...), vehiculo_id: Optional[int] = Query(None)):
        try:
            return service.obtener_mis_demos(usuario_id, vehiculo_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener demostraciones: {str(e)}")

    @router.post("/mis-demos", status_code=status.HTTP_201_CREATED, summary="Crear demostración personalizada propia")
    def crear_mi_demo(payload: DemoUsuarioCrear):
        try:
            if not payload.usuario_id:
                raise HTTPException(status_code=400, detail="Se requiere el usuario_id para crear una demo propia.")
            return service.crear_mi_demo(
                usuario_id=payload.usuario_id,
                id_vehiculo=payload.id_vehiculo,
                nombre=payload.nombre,
                descripcion=payload.descripcion
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear demostración propia: {str(e)}")

    @router.delete("/mis-demos/{id_demo}", summary="Eliminar demostración propia del usuario")
    def eliminar_mi_demo(id_demo: int, usuario_id: int = Query(...)):
        try:
            return service.eliminar_mi_demo(usuario_id, id_demo)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar demo: {str(e)}")

    # ─────────────────────────────────────────────────────────────
    # SOPORTE Y AUDITORÍA
    # ─────────────────────────────────────────────────────────────
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

    # ─────────────────────────────────────────────────────────────
    # SESIÓN DE INVITADO CON QR (15 SEGUNDOS)
    # ─────────────────────────────────────────────────────────────
    @router.post("/invitado/sesion", summary="Generar sesión de prueba de invitado con QR (15s)")
    def crear_sesion_invitado(payload: InvitadoReservaRequest):
        try:
            return service.crear_sesion_invitado(
                vehiculo_id=payload.vehiculo_id,
                duracion_segundos=payload.duracion_segundos or 15
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear sesión de invitado: {str(e)}")

    return router
