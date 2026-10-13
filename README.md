# Práctica 2.5 — API IoT local con FastAPI

## Instalar (desde la carpeta raíz)

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Completa `.env` con las credenciales de la base Amazon RDS. **Nunca subas `.env` a GitHub**.

## Iniciar

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentación interactiva: http://127.0.0.1:8000/docs

WebSocket local: ws://127.0.0.1:8000/ws

## Pruebas Thunder Client

1. `GET http://localhost:8000/vehiculos`
2. `POST http://localhost:8000/movimientos` con body JSON `{ "id_vehiculo": 1, "id_comando": 1 }`. Debe actualizar estado e historial y enviar evento por WebSocket.
3. `POST http://localhost:8000/demos/ejecutar` con body JSON `{ "id_vehiculo": 1, "id_demo": 1 }`. Debe emitir 8 eventos secuenciales por WebSocket, actualizar estado y NO escribir historial.

En otra pestaña del cliente WebSocket conecta primero a `ws://localhost:8000/ws` y observa los mensajes.

### Advertencias

- Usa credenciales con permisos `EXECUTE` para los 21 procedimientos.
- Comprueba el motor compatible de Amazon RDS y el usuario DEFINER de los procedimientos.
- La DEMO responde al finalizar, tras ~la suma de todas las duraciones y pausas; no representa control de hardware real.
- Este prototipo es para desarrollo local. No dispone de autenticación ni de límites de peticiones; no lo publiques sin añadir esos controles.
- Evita ejecutar comandos manuales y DEMO simultáneamente para el mismo vehículo durante pruebas.
- Una demo sigue ejecutándose incluso si el cliente HTTP se desconecta, salvo si se interrumpe el proceso servidor.

`GET/POST /status` son rutas anteriores que continúan utilizando `app/data/status.json`; los nuevos endpoints de movimientos/estado consultan RDS.
