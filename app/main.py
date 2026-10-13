from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.database.mysql import Database
from app.services.vehicle_service import VehicleService
from app.services.demo_service import DemoService
from app.websocket.websocket_manager import WebSocketManager
from app.routers.api import build_router
from app.models.estado import Estado
from app.services.status_service import StatusService

app = FastAPI(title='API IoT - Práctica 2.5', description='FastAPI + POO + 21 procedimientos de Amazon RDS + WebSocket', version='2.5')
ws_manager = WebSocketManager()
db = Database()
vehicles = VehicleService(db)
demos = DemoService(vehicles, ws_manager)
app.include_router(build_router(db, vehicles, demos, ws_manager))

status_service = StatusService()

@app.get('/status', tags=['Compatibilidad'])
def status():
    return status_service.obtener_estado()

@app.post('/status', tags=['Compatibilidad'])
async def cambiar_status(estado: Estado):
    nuevo = status_service.guardar_estado(estado.status)
    await ws_manager.enviar_a_todos(nuevo)
    return nuevo

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.conectar(websocket)
    await websocket.send_json({'tipo': 'conexion', 'mensaje': 'Conectado a API IoT'})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.desconectar(websocket)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host='127.0.0.1', port=8000)
