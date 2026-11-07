/**
 * app.js — Punto de entrada principal
 * Inicializa todos los módulos, conecta servicios y UI.
 */

import { wsClient }         from './ws/ws-client.js';
import { commandService, CMD_STATE } from './domain/commands.js';
import { demoService }      from './domain/demo.js';
import { Joystick }         from './ui/joystick.js';
import { SecondaryButtons } from './ui/buttons.js';
import { ConnectivityPanel } from './ui/connectivity.js';
import { DemoPanel }        from './ui/demo-panel.js';
import { messageService }   from './ui/messages.js';
import { COMMANDS }         from './config.js';

/** Inicialización de la aplicación */
function init() {
  // 1. Conectar WebSocket
  wsClient.connect();

  // 2. Panel de conectividad
  new ConnectivityPanel();

  // 3. Joystick
  new Joystick('#joystick-container');

  // 4. Botones secundarios (Garra, Bocina)
  new SecondaryButtons();

  // 5. Panel de DEMOs
  new DemoPanel();

  // 6. Botón DETENER
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

  // 8. Reaccionar a estados del commandService → feedback visual global
  commandService.addEventListener('cmd:state', (e) => {
    const { state, command, error } = e.detail;
    const actionEl = document.getElementById('last-action');
    if (!actionEl) return;

    switch (state) {
      case CMD_STATE.SENDING:
        actionEl.textContent = `Enviando: ${command.nombre}…`;
        actionEl.className = 'action-text sending';
        break;
      case CMD_STATE.ACCEPTED:
        actionEl.textContent = `✔ ${command.nombre}`;
        actionEl.className = 'action-text accepted';
        break;
      case CMD_STATE.ERROR:
        actionEl.textContent = `✘ Error: ${error?.message ?? 'Sin respuesta'}`;
        actionEl.className = 'action-text error';
        messageService.error(`Error al enviar ${command.nombre}: ${error?.message ?? 'Sin respuesta'}`);
        break;
    }
  });

  // 9. Rutear eventos WebSocket a demoService
  wsClient.addEventListener('ws:message', (e) => {
    const data = e.detail;
    demoService.handleWsEvent(data);

    // Log de evento en el panel de acción
    const actionEl = document.getElementById('last-action');
    if (actionEl && data.tipo === 'movimiento') {
      actionEl.textContent = `📡 WS: ${data.comando} · código ${data.codigo} · ${data.origen}`;
      actionEl.className = 'action-text accepted';
    }
  });

  // 10. Feedback de conexión WebSocket
  wsClient.addEventListener('ws:status', (e) => {
    const { status } = e.detail;
    if (status === 'online') {
      messageService.success('WebSocket conectado');
    } else if (status === 'disconnected') {
      messageService.warning('WebSocket desconectado — reconectando…');
    }
  });
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
