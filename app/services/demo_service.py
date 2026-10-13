import asyncio
from fastapi import HTTPException
from app.services.vehicle_service import VehicleService
from app.websocket.websocket_manager import WebSocketManager

class DemoService:
    def __init__(self, vehicles: VehicleService, sockets: WebSocketManager):
        self.vehicles = vehicles
        self.sockets = sockets
        self.locks = {}

    async def execute(self, id_vehiculo: int, id_demo: int):
        lock = self.locks.setdefault(id_vehiculo, asyncio.Lock())
        if lock.locked():
            raise HTTPException(409, 'Ya hay una DEMO en ejecución para este vehículo')
        async with lock:
            demos = await asyncio.to_thread(self.vehicles.db.call, 'sp_obtener_demos', id_vehiculo)
            if not any(d['id_demo'] == id_demo and d['activo'] for d in demos):
                raise HTTPException(404, 'DEMO inexistente o inactiva para este vehículo')
            steps = await asyncio.to_thread(self.vehicles.db.call, 'sp_obtener_movimientos_demo', id_demo)
            if not steps:
                raise HTTPException(400, 'La DEMO no tiene movimientos')
            # Validate all before emitting the first movement.
            for step in steps:
                await asyncio.to_thread(self.vehicles.validate_move, id_vehiculo, step['id_comando'])
            for step in steps:
                event = await asyncio.to_thread(self.vehicles.move, id_vehiculo, step['id_comando'], 'DEMO', False)
                event.update(tipo='demo_movimiento', id_demo=id_demo, orden=step['orden'],
                             duracion_ms=step['duracion_ms'], pausa_ms=step['pausa_ms'])
                await self.sockets.enviar_a_todos(event)
                await asyncio.sleep((step['duracion_ms'] + step['pausa_ms']) / 1000)
            result = {'tipo': 'demo_finalizada', 'id_demo': id_demo, 'id_vehiculo': id_vehiculo,
                      'total_movimientos': len(steps)}
            await self.sockets.enviar_a_todos(result)
            return result
