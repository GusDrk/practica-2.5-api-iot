/**
 * app.js — Punto de entrada principal
 * Inicializa todos los módulos, conecta servicios y UI.
 */

import { wsClient }         from './ws/ws-client.js';
import { commandService, CMD_STATE } from './domain/commands.js';
import { demoService }      from './domain/demo.js';
import { monitoringService } from './domain/monitoring.js';
import { Joystick }         from './ui/joystick.js';
import { SecondaryButtons } from './ui/buttons.js';
import { ConnectivityPanel } from './ui/connectivity.js';
import { DemoPanel }        from './ui/demo-panel.js';
import { Navigation }       from './ui/navigation.js';
import { MonitoringView }   from './ui/monitoring-view.js';
import { AdminView }        from './ui/admin-view.js?v=4.3';
import { messageService }   from './ui/messages.js';
import { formatCommandName } from './utils/command-formatter.js';
import { COMMANDS, ENDPOINTS, CONFIG } from './config.js?v=2.5';
import { http } from './api/http-client.js';
import { WS_STATUS } from './ws/ws-client.js';

/** Inicialización de la aplicación */
function init() {
  // 1. Conectar WebSocket
  wsClient.connect();

  // 2. Navegación superior (Control / Monitoreo)
  const navigation = new Navigation();

  // 3. Vista de Monitoreo
  const monitoringView = new MonitoringView();

  // 3.1 Vista de Administración
  const adminView = new AdminView();

  // 4. Panel de conectividad
  new ConnectivityPanel();

  // 5. Cargar nombre real del vehículo desde la API
  loadVehicleName();

  // 6. Joystick
  new Joystick('#joystick-container');

  // 7. Botones secundarios (Garra, Bocina)
  new SecondaryButtons();

  // 8. Panel de DEMOs
  new DemoPanel();

  // 9. Cargar datos iniciales de monitoreo en segundo plano
  monitoringService.loadInitialData().catch(() => {});

  // 10. Botón DETENER
  const btnStop = document.getElementById('btn-stop');
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      commandService.stop().catch(() => {});
    });
    // Acceso por teclado con tecla Q (igual que descripción del backend)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        commandService.stop().catch(() => {});
      }
    });
  }

  // 7. Accesos de teclado para movimientos
  const keyMap = {
    'w': COMMANDS.AVANZAR,
    's': COMMANDS.RETROCEDER,
    'a': COMMANDS.GIRAR_IZQ,
    'd': COMMANDS.GIRAR_DER,
    'u': COMMANDS.SUBIR_GARRA,
    'j': COMMANDS.BAJAR_GARRA,
    'b': COMMANDS.BOCINA,
  };
  const keysDown = new Set();
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'q') return; // Ya manejado arriba
    if (keysDown.has(key)) return;
    const cmd = keyMap[key];
    if (cmd) {
      keysDown.add(key);
      commandService.send(cmd).catch(() => {});
    }
  });
  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keysDown.delete(key);
    const cmd = keyMap[key];
    if (cmd) {
      commandService.stop().catch(() => {});
    }
  });

  // 9. Reaccionar a estados del commandService → feedback visual global
  commandService.addEventListener('cmd:state', (e) => {
    const { state, command, error } = e.detail;
    const actionEl  = document.getElementById('last-action');
    const timeEl    = document.getElementById('last-action-time');
    if (!actionEl) return;

    const now = new Date().toLocaleTimeString('es-MX', { hour12: false });

    switch (state) {
      case CMD_STATE.SENDING:
        actionEl.textContent = `Enviando: ${command.nombre}…`;
        actionEl.className = 'action-text sending';
        if (timeEl) timeEl.textContent = now;
        break;
      case CMD_STATE.ACCEPTED:
        actionEl.textContent = `✔ ${command.nombre}`;
        actionEl.className = 'action-text accepted';
        if (timeEl) timeEl.textContent = now;
        break;
      case CMD_STATE.ERROR:
        actionEl.textContent = `✘ Error: ${error?.message ?? 'Sin respuesta'}`;
        actionEl.className = 'action-text error';
        if (timeEl) timeEl.textContent = now;
        messageService.error(`Error al enviar ${command.nombre}: ${error?.message ?? 'Sin respuesta'}`);
        break;
    }
  });

  // 10. Rutear eventos WebSocket a demoService y monitoringService
  wsClient.addEventListener('ws:message', (e) => {
    const data = e.detail;
    demoService.handleWsEvent(data);
    monitoringService.handleWsEvent(data);

    // Log de evento en el panel de acción
    const actionEl = document.getElementById('last-action');
    const timeEl   = document.getElementById('last-action-time');
    const now = new Date().toLocaleTimeString('es-MX', { hour12: false });
    if (actionEl && data.tipo === 'movimiento') {
      const friendlyName = formatCommandName(data.comando, data.codigo);
      actionEl.textContent = `📡 WS: ${friendlyName} · código ${data.codigo} · ${data.origen}`;
      actionEl.className = 'action-text accepted';
      if (timeEl) timeEl.textContent = now;
    }
  });

  // 11. Feedback de conexión WebSocket + badge del header + reconexión monitoreo
  wsClient.addEventListener('ws:status', (e) => {
    const { status } = e.detail;
    updateHeaderWsBadge(status);
    if (status === 'online') {
      messageService.success('WebSocket conectado');
      monitoringService.handleWsReconnect();
    } else if (status === 'disconnected') {
      messageService.warning('WebSocket desconectado — reconectando…');
    }
  });

  // Inicializar badge con estado actual
  updateHeaderWsBadge(wsClient.status);
}

/**
 * Carga el nombre real del vehículo desde GET /vehiculos/{id}
 * y lo muestra en el header.
 */
async function loadVehicleName() {
  try {
    const url  = `${CONFIG.API_BASE_URL}/vehiculos/${CONFIG.VEHICLE_ID}`;
    const data = await http.get(url);
    if (data && data.nombre) {
      const nameEl = document.getElementById('vehicle-name');
      const idEl   = document.getElementById('vehicle-id-label');
      if (nameEl) nameEl.textContent = data.nombre;
      if (idEl)   idEl.textContent   = `Vehículo #${data.id_vehiculo ?? CONFIG.VEHICLE_ID}`;
      document.title = `${data.nombre} · Control IoT`;
    }
  } catch {
    // Si falla, mantiene el texto estático por defecto
  }
}

/**
 * Actualiza el badge de WebSocket en el header según el estado.
 * @param {'online'|'connecting'|'disconnected'} status
 */
function updateHeaderWsBadge(status) {
  const badge  = document.getElementById('header-ws-badge');
  const text   = document.getElementById('header-ws-text');
  if (!badge || !text) return;

  badge.classList.remove('online', 'connecting', 'offline');

  switch (status) {
    case 'online':
      badge.classList.add('online');
      text.textContent = 'Conectado';
      break;
    case 'connecting':
      badge.classList.add('connecting');
      text.textContent = 'Reconectando…';
      break;
    default:
      badge.classList.add('offline');
      text.textContent = 'Desconectado';
  }
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

