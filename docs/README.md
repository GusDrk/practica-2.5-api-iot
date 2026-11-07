# IoT Vehicle Control — Práctica 2.5

> **Frontend de control** para vehículo robótico IoT.  
> Desarrollado por **Victor Gustavo Garcia Perez** · 2026

---

## 🏗️ Arquitectura y flujo de datos

```
┌─────────────────────────────────────────────────────┐
│               NAVEGADOR (GitHub Pages / Local)       │
│                                                     │
│  index.html ──► app.js (entry point)                │
│                   │                                 │
│         ┌─────────┼──────────┐                      │
│         ▼         ▼          ▼                      │
│    Joystick   Buttons    DemoPanel                   │
│         │         │          │                      │
│         └────►  commandService  ◄──────┐            │
│                   │                   │            │
│              http-client.js       demoService       │
│                   │                   │            │
│         ┌─────────┘         wsClient  │            │
│         ▼                      │      │            │
│  ConnectivityPanel ◄───────────┘      │            │
│         │                             │            │
└─────────┼─────────────────────────────┼────────────┘
          │  REST (HTTP)                │ WebSocket
          ▼                             ▼
┌─────────────────────────────────────────────────────┐
│          FastAPI · AWS · 100.56.60.192:8000          │
│                                                     │
│  POST /movimientos     ──►  Envía comando           │
│  POST /demos/ejecutar  ──►  Ejecuta DEMO            │
│  GET  /vehiculos/1/comandos  Catálogo               │
│  GET  /vehiculos/1/demos     Lista DEMOs            │
│  GET  /status           ──►  Health API             │
│  WS   /ws               ◄──  Eventos en tiempo real │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│  Amazon RDS     │
│  MySQL (21 SPs) │
└─────────────────┘
```

---

## 📁 Árbol de archivos

```
docs/
├── index.html              # Página principal (HTML semántico, Mobile First)
├── favicon.svg             # Favicon SVG del proyecto
├── css/
│   └── style.css           # Diseño completo — tokens, componentes, responsive
└── js/
    ├── config.js            # URLs, VEHICLE_ID, catálogo de comandos
    ├── app.js               # Entry point — inicializa y conecta todos los módulos
    ├── api/
    │   └── http-client.js   # Cliente Fetch centralizado con timeout/AbortController
    ├── ws/
    │   └── ws-client.js     # WebSocket con reconexión exponencial
    ├── domain/
    │   ├── commands.js      # Servicio de envío de comandos (singleton)
    │   └── demo.js          # Dominio de DEMOs (carga, ejecución, estado)
    └── ui/
        ├── joystick.js      # Joystick táctil (Pointer Events)
        ├── buttons.js       # Botones secundarios (Garra, Bocina)
        ├── connectivity.js  # Panel de 3 indicadores de conectividad
        ├── demo-panel.js    # Panel de selección y ejecución de DEMOs
        └── messages.js      # Sistema de notificaciones toast
```

---

## ⚙️ Configuración

Edita únicamente [`docs/js/config.js`](docs/js/config.js):

```js
export const CONFIG = {
  API_BASE_URL: 'http://100.56.60.192:8000',  // ← URL de tu instancia AWS
  WS_URL:       'ws://100.56.60.192:8000/ws', // ← URL WebSocket
  VEHICLE_ID:   1,                             // ← ID del vehículo en RDS
  REQUEST_TIMEOUT_MS:      8000,
  WS_RECONNECT_INTERVAL_MS: 3000,
  HEALTH_CHECK_INTERVAL_MS: 15000,
};
```

---

## 🚀 Ejecución local

> ⚠️ **Requiere servidor HTTP local** — no abrir `index.html` directamente como
> `file://` porque los ES Modules no funcionan sin servidor.

### Opción 1 — Python (sin instalar nada extra)
```bash
cd docs
python -m http.server 5500
# Abrir: http://localhost:5500
```

### Opción 2 — Node.js `serve`
```bash
npx serve docs
```

### Opción 3 — VS Code Live Server
Instala la extensión **Live Server**, clic derecho en `docs/index.html` → "Open with Live Server".

---

## 📡 Panel de conectividad — 3 indicadores

| Indicador | Fuente real | Estados |
|---|---|---|
| **WebSocket** | `ws://100.56.60.192:8000/ws` | 🟢 En línea / 🟡 Reconectando / 🔴 Desconectado |
| **API AWS** | `GET /status` → `{"STATUS":1}` | 🟢 Disponible / 🟡 Comprobando / 🔴 No disponible |
| **Amazon RDS** | *(sin endpoint de salud)* | ⚫ Sin verificar |

---

## 🕹️ Mapa de comandos

| Acción | Joystick | Teclado | id_comando | código |
|---|---|---|---|---|
| Avanzar | Arriba | `W` | 1 | 1 |
| Retroceder | Abajo | `S` | 2 | 2 |
| Girar izquierda | Izquierda | `A` | 3 | 3 |
| Girar derecha | Derecha | `D` | 4 | 4 |
| Subir garra | Botón | `U` | 5 | 5 |
| Bajar garra | Botón | `J` | 6 | 6 |
| Bocina | Botón | `B` | 7 | 7 |
| **DETENER** | Soltar joystick | `Q` | 8 | 8 |

---

## 🧪 Casos de prueba paso a paso

### A. Joystick táctil / mouse
1. Abre `http://localhost:5500`
2. Haz clic y arrastra el joystick hacia arriba
3. **Esperado**: toast "Enviando: AVANZAR…" → "✔ AVANZAR"
4. Suelta el joystick
5. **Esperado**: se envía `APAGAR_TODO` automáticamente

### B. DETENER prioritario
1. Mantén pulsado el joystick en cualquier dirección
2. Presiona el botón rojo **DETENER** o tecla `Q`
3. **Esperado**: se cancela visualmente el estado anterior y se envía `APAGAR_TODO`

### C. Verificar WebSocket con Postman / Thunder Client
1. Abre Postman → nueva pestaña WebSocket
2. Conecta a: `ws://100.56.60.192:8000/ws`
3. Verás el mensaje de bienvenida:
   ```json
   {"tipo": "conexion", "mensaje": "Conectado a API IoT"}
   ```
4. Desde el frontend, mueve el joystick
5. En Postman verás en tiempo real:
   ```json
   {"tipo":"movimiento","id_vehiculo":1,"id_comando":1,
    "comando":"AVANZAR","codigo":1,"origen":"MANUAL"}
   ```

### D. Verificar DEMO
1. En Postman WS, mantén la sesión abierta
2. En el frontend, selecciona una DEMO e inicia
3. En Postman verás secuencia de eventos `demo_movimiento`:
   ```json
   {"tipo":"demo_movimiento","id_demo":1,"orden":1,
    "duracion_ms":1000,"pausa_ms":500,"comando":"AVANZAR",...}
   ```
4. Al finalizar:
   ```json
   {"tipo":"demo_finalizada","id_demo":1,"id_vehiculo":1,"total_movimientos":5}
   ```

### E. Error de red
1. Desconecta el WiFi o apaga la API
2. **Esperado**: indicador API → "No disponible", indicador WS → "Desconectado"
3. Reconecta → indicadores vuelven a verde automáticamente

### F. Diseño móvil
1. Abre DevTools → modo móvil (iPhone SE, 375px)
2. Verifica: joystick visible y funcional, botones táctiles ≥ 44px, footer no superpuesto
3. Rota a landscape → verifica que no hay desbordamientos

---

## 🔒 Checklist de seguridad

- [x] Sin credenciales, tokens AWS ni datos de RDS en archivos públicos
- [x] JSON remoto validado antes de usarse en el DOM (`.tipo`, `.comando`)
- [x] Sin `innerHTML` con datos externos — solo `textContent`
- [x] CORS ya configurado en el backend (`allow_origins=['*']`)
- [x] Timeout en todas las peticiones HTTP (8 s)
- [x] WebSocket del navegador ≠ estado del ESP8266 físico (no se afirma que el vehículo está "en línea" solo porque el WS conecta)
- [x] RDS marcado "Sin verificar" — no se expone conexión MySQL al frontend

> ⚠️ **Mixed Content**: la API usa `http://` y el WS usa `ws://`. Si en el futuro
> publicas en GitHub Pages (`https://`), el navegador bloqueará las conexiones.
> Solución: agregar SSL al servidor AWS (Caddy, nginx + Let's Encrypt o certificado ACM).

---

## ✅ Checklist de accesibilidad

- [x] `lang="es"` en `<html>`
- [x] Un solo `<h1>` implícito (título de la app en header)
- [x] `aria-label` en todos los controles interactivos
- [x] `aria-live="polite"` en zonas de estado dinámico
- [x] `role="status"` en el texto de última acción
- [x] `:focus-visible` con outline visible en todos los botones
- [x] Áreas táctiles ≥ 44×44 px en móvil
- [x] Contraste de texto: colores primarios `#f1f5f9` sobre fondos oscuros `#111827`
- [x] Soporte de teclado completo: W/A/S/D/U/J/B/Q

---

## 📦 Publicación en GitHub Pages

> ⚠️ **Solo cuando tengas SSL en la API** (ver sección Mixed Content).

1. Ve a tu repositorio → **Settings** → **Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/docs`
4. Guarda — GitHub publicará en `https://GusDrk.github.io/practica-2.5-api-iot/`
5. Verifica que el favicon aparece en la pestaña del navegador

---

## 🗂️ Commits recomendados

```bash
git add docs/
git commit -m "feat: add IoT Vehicle Control frontend (Práctica 2.5)"
git push origin main
```
