/**
 * connectivity.js — Panel de conectividad (3 indicadores)
 * - WebSocket WSS: En línea / Conectando-Reconectando / Desconectado
 * - API AWS: Disponible / Comprobando / No disponible
 * - Amazon RDS: Sin verificar (no existe endpoint de salud)
 */

import { wsClient, WS_STATUS } from '../ws/ws-client.js';
import { http } from '../api/http-client.js';
import { ENDPOINTS, CONFIG } from '../config.js';

/** Etiquetas y clases CSS por estado */
const WS_LABELS = {
  [WS_STATUS.ONLINE]:       { text: 'En línea',        cls: 'status-online' },
  [WS_STATUS.CONNECTING]:   { text: 'Reconectando…',   cls: 'status-connecting' },
  [WS_STATUS.DISCONNECTED]: { text: 'Desconectado',    cls: 'status-offline' },
};

export class ConnectivityPanel {
  #wsEl;
  #apiEl;
  #rdsEl;
  #healthTimer = null;

  constructor() {
    this.#wsEl  = document.getElementById('conn-ws');
    this.#apiEl = document.getElementById('conn-api');
    this.#rdsEl = document.getElementById('conn-rds');

    // RDS: sin endpoint de salud → siempre "Sin verificar"
    this.#renderRds('Sin verificar', 'status-unknown');
    this.#renderWs(wsClient.status);

    wsClient.addEventListener('ws:status', (e) => {
      this.#renderWs(e.detail.status);
    });

    this.#startApiPolling();
  }

  #renderWs(status) {
    const { text, cls } = WS_LABELS[status] ?? WS_LABELS[WS_STATUS.DISCONNECTED];
    this.#render(this.#wsEl, text, cls);
  }

  #renderApi(text, cls) { this.#render(this.#apiEl, text, cls); }
  #renderRds(text, cls) { this.#render(this.#rdsEl, text, cls); }

  #render(el, text, cls) {
    if (!el) return;
    el.querySelector('.conn-label').textContent = text;
    el.querySelector('.conn-dot').className = `conn-dot ${cls}`;
  }

  #startApiPolling() {
    this.#checkApi();
    this.#healthTimer = setInterval(
      () => this.#checkApi(),
      CONFIG.HEALTH_CHECK_INTERVAL_MS
    );
  }

  async #checkApi() {
    this.#renderApi('Comprobando…', 'status-connecting');
    try {
      const data = await http.get(ENDPOINTS.status());
      // Respuesta real: { "STATUS": 1 }
      if (data && typeof data.STATUS !== 'undefined') {
        this.#renderApi('Disponible', 'status-online');
      } else {
        this.#renderApi('No disponible', 'status-offline');
      }
    } catch {
      this.#renderApi('No disponible', 'status-offline');
    }
  }

  destroy() {
    clearInterval(this.#healthTimer);
  }
}
