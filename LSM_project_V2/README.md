# Control por seña: índice = avanzar

Proyecto nuevo y sin entrenamiento: usa MediaPipe para detectar una mano y
ejecuta los comandos existentes de la API. Mantén una seña durante 0.6 segundos
para confirmarla. Al cambiar o perder una seña, desactivar el control o cerrar
el programa, manda `APAGAR_TODO`.

| Seña | Comando |
| --- | --- |
| Índice | AVANZAR |
| Índice y medio | RETROCEDER |
| Pulgar a la izquierda | GIRAR IZQUIERDA |
| Pulgar a la derecha | GIRAR DERECHA |
| Pulgar arriba | SUBIR GARRA |
| Pulgar abajo | BAJAR GARRA |
| Puño | BOCINA |
| Palma abierta | APAGAR TODO inmediatamente |

## Preparación

Desde la raíz del repositorio:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r .\LSM_project_V2\requirements.txt
PowerShell -ExecutionPolicy Bypass -File .\LSM_project_V2\download_model.ps1
```

Inicia la API en una terminal distinta:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Ejecución

En otra terminal, desde la raíz:

```powershell
python .\LSM_project_V2\sign_control.py
```

Pulsa `A` para activar el control. `Q` o `Esc` cierran el programa y detienen
el carrito. Mantén la palma aproximadamente frente a la cámara para que las
direcciones del pulgar sean consistentes.

Valores predeterminados: vehículo `1`, AVANZAR `1`, APAGAR_TODO `8` y cámara
`0`. Cámbialos si hace falta:

```powershell
python .\LSM_project_V2\sign_control.py --camera 1 --vehicle-id 1 --api-url https://carroiotgrua.duckdns.org
```
