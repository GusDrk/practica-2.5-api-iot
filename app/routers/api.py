from fastapi import APIRouter, HTTPException
from app.database.mysql import Database
from app.schemas.requests import (VehiculoCrear, VehiculoActualizar, ComandoCrear,
    ComandoActualizar, DemoCrear, DemoActualizar, MovimientoCrear, MovimientoActualizar,
    EjecutarComando, EjecutarDemo)
from app.services.vehicle_service import VehicleService
from app.services.demo_service import DemoService
from app.websocket.websocket_manager import WebSocketManager


def build_router(db: Database, vehicles: VehicleService, demos: DemoService, ws: WebSocketManager):
    router = APIRouter()
    def ok(procedure, *args):
        return db.call(procedure, *args)

    @router.get('/vehiculos', tags=['Vehículos'])
    def get_vehiculos(): return ok('sp_obtener_vehiculos')

    @router.get('/vehiculos/{id_vehiculo}', tags=['Vehículos'])
    def get_vehiculo(id_vehiculo: int): return vehicles.one('sp_obtener_vehiculo', id_vehiculo)

    @router.post('/vehiculos', tags=['Vehículos'], status_code=201)
    def crear_vehiculo(x: VehiculoCrear): return ok('sp_crear_vehiculo', x.nombre, x.modelo, x.descripcion, x.microcontrolador)[0]

    @router.put('/vehiculos/{id_vehiculo}', tags=['Vehículos'])
    def editar_vehiculo(id_vehiculo: int, x: VehiculoActualizar):
        vehicles.one('sp_obtener_vehiculo', id_vehiculo)
        ok('sp_actualizar_vehiculo', id_vehiculo, x.nombre, x.modelo, x.descripcion, x.microcontrolador, x.activo)
        return {'actualizado': True}

    @router.delete('/vehiculos/{id_vehiculo}', tags=['Vehículos'])
    def borrar_vehiculo(id_vehiculo: int):
        vehicles.one('sp_obtener_vehiculo', id_vehiculo)
        ok('sp_eliminar_vehiculo', id_vehiculo)
        return {'eliminado': True}

    @router.get('/vehiculos/{id_vehiculo}/comandos', tags=['Comandos'])
    def get_comandos(id_vehiculo: int): return ok('sp_obtener_comandos_vehiculo', id_vehiculo)

    @router.post('/comandos', tags=['Comandos'], status_code=201)
    def crear_comando(x: ComandoCrear): return ok('sp_crear_comando', x.id_vehiculo, x.nombre, x.codigo, x.descripcion)[0]

    @router.put('/comandos/{id_comando}', tags=['Comandos'])
    def editar_comando(id_comando: int, x: ComandoActualizar):
        ok('sp_actualizar_comando', id_comando, x.nombre, x.codigo, x.descripcion, x.activo)
        return {'actualizado': True}

    @router.delete('/comandos/{id_comando}', tags=['Comandos'])
    def borrar_comando(id_comando: int):
        ok('sp_eliminar_comando', id_comando)
        return {'eliminado': True}

    @router.get('/vehiculos/{id_vehiculo}/estado', tags=['Estado'])
    def get_estado(id_vehiculo: int): return ok('sp_obtener_estado', id_vehiculo)

    @router.get('/vehiculos/{id_vehiculo}/historial', tags=['Historial'])
    def get_historial(id_vehiculo: int): return ok('sp_obtener_historial', id_vehiculo)

    @router.post('/movimientos', tags=['Operaciones'])
    async def movimiento(x: EjecutarComando):
        import asyncio
        result = await asyncio.to_thread(vehicles.move, x.id_vehiculo, x.id_comando)
        await ws.enviar_a_todos(result)
        return result

    @router.get('/vehiculos/{id_vehiculo}/demos', tags=['DEMOs'])
    def get_demos(id_vehiculo: int): return ok('sp_obtener_demos', id_vehiculo)

    @router.post('/demos', tags=['DEMOs'], status_code=201)
    def crear_demo(x: DemoCrear): return ok('sp_crear_demo', x.id_vehiculo, x.nombre, x.descripcion)[0]

    @router.put('/demos/{id_demo}', tags=['DEMOs'])
    def editar_demo(id_demo: int, x: DemoActualizar):
        ok('sp_actualizar_demo', id_demo, x.nombre, x.descripcion, x.activo)
        return {'actualizado': True}

    @router.delete('/demos/{id_demo}', tags=['DEMOs'])
    def borrar_demo(id_demo: int):
        ok('sp_eliminar_demo', id_demo)
        return {'eliminado': True}

    @router.get('/demos/{id_demo}/movimientos', tags=['DEMOs'])
    def get_demo_movimientos(id_demo: int): return ok('sp_obtener_movimientos_demo', id_demo)

    @router.post('/demos/movimientos', tags=['DEMOs'], status_code=201)
    def crear_demo_movimiento(x: MovimientoCrear):
        ok('sp_agregar_movimiento_demo', x.id_demo, x.id_comando, x.orden, x.duracion_ms, x.pausa_ms)
        return {'creado': True}

    @router.put('/demos/movimientos/{id_movimiento}', tags=['DEMOs'])
    def editar_demo_movimiento(id_movimiento: int, x: MovimientoActualizar):
        ok('sp_actualizar_movimiento_demo', id_movimiento, x.id_comando, x.orden, x.duracion_ms, x.pausa_ms)
        return {'actualizado': True}

    @router.delete('/demos/movimientos/{id_movimiento}', tags=['DEMOs'])
    def borrar_demo_movimiento(id_movimiento: int):
        ok('sp_eliminar_movimiento_demo', id_movimiento)
        return {'eliminado': True}

    @router.post('/demos/ejecutar', tags=['Operaciones'])
    async def ejecutar_demo(x: EjecutarDemo): return await demos.execute(x.id_vehiculo, x.id_demo)

    return router
