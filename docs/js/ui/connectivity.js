/**
 * connectivity.js — Panel de conectividad (3 indicadores reales)
 * - WebSocket WSS: En línea / Reconectando / Desconectado
 * - API AWS: Disponible / Comprobando / No disponible
 * - Amazon RDS: Conectado (verificado contra sp_obtener_vehiculo en MySQL) / Comprobando / No disponible
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

    this.#renderWs(wsClient.status);
    this.#renderRds('Comprobando…', 'status-connecting');

    wsClient.addEventListener('ws:status', (e) => {
      this.#renderWs(e.detail.status);
    });

    this.#startPolling();
  }

  #renderWs(status) {
    const { text, cls } = WS_LABELS[status] ?? WS_LABELS[WS_STATUS.DISCONNECTED];
    this.#render(this.#wsEl, text, cls);
  }

  #renderApi(text, cls) { this.#render(this.#apiEl, text, cls); }
  #renderRds(text, cls) { this.#render(this.#rdsEl, text, cls); }

  #render(el, text, cls) {
    if (!el) return;
    const label = el.querySelector('.conn-label');
    const dot   = el.querySelector('.conn-dot');
    if (label) label.textContent = text;
    if (dot)   dot.className = `conn-dot ${cls}`;
  }

  #startPolling() {
    this.#checkApi();
    this.#checkRds();
    this.#healthTimer = setInterval(() => {
      this.#checkApi();
      this.#checkRds();
    }, CONFIG.HEALTH_CHECK_INTERVAL_MS);
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

  /**
   * Verifica la conexión real con Amazon RDS MySQL
   * consultando el vehículo #1 (ejecuta sp_obtener_vehiculo en RDS).
   */
  async #checkRds() {
    this.#renderRds('Comprobando…', 'status-connecting');
    try {
      const data = await http.get(ENDPOINTS.vehiculo(CONFIG.VEHICLE_ID));
      if (data && data.id_vehiculo) {
        this.#renderRds('Conectado', 'status-online');
      } else {
        this.#renderRds('No disponible', 'status-offline');
      }
    } catch {
      this.#renderRds('No disponible', 'status-offline');
    }
  }

  destroy() {
    if (this.#healthTimer) {
      clearInterval(this.#healthTimer);
    }
  }
}
