/**
 * ws-client.js — Cliente WebSocket con reconexión automática
 * Maneja apertura, error, cierre y reconexión exponencial.
 * Despacha eventos DOM para que otros módulos reaccionen.
 */

import { CONFIG } from '../config.js';

/** Estados posibles del WebSocket */
export const WS_STATUS = {
  CONNECTING:    'connecting',
  ONLINE:        'online',
  DISCONNECTED:  'disconnected',
};

class WebSocketClient extends EventTarget {
  #socket = null;
  #retryCount = 0;
  #retryTimer = null;
  #intentionallyClosed = false;
  #status = WS_STATUS.DISCONNECTED;

  get status() { return this.#status; }

  connect() {
    if (this.#socket &&
        (this.#socket.readyState === WebSocket.OPEN ||
         this.#socket.readyState === WebSocket.CONNECTING)) return;

    this.#intentionallyClosed = false;
    this.#setStatus(WS_STATUS.CONNECTING);

    try {
      this.#socket = new WebSocket(CONFIG.WS_URL);
    } catch (e) {
      this.#scheduleReconnect();
      return;
    }

    this.#socket.onopen = () => {
      this.#retryCount = 0;
      this.#setStatus(WS_STATUS.ONLINE);
    };

    this.#socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Validar que sea un objeto con 'tipo' antes de propagar
        if (data && typeof data === 'object' && data.tipo) {
          this.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
        }
      } catch {
        // Mensaje no JSON — ignorar
      }
    };

    this.#socket.onerror = () => {
      // onerror siempre va seguido de onclose
    };

    this.#socket.onclose = () => {
      this.#socket = null;
      if (!this.#intentionallyClosed) {
        this.#setStatus(WS_STATUS.DISCONNECTED);
        this.#scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.#intentionallyClosed = true;
    clearTimeout(this.#retryTimer);
    if (this.#socket) {
      this.#socket.close();
      this.#socket = null;
    }
    this.#setStatus(WS_STATUS.DISCONNECTED);
  }

  #scheduleReconnect() {
    if (CONFIG.WS_MAX_RETRIES !== -1 && this.#retryCount >= CONFIG.WS_MAX_RETRIES) return;

    // Backoff exponencial: mín 3 s, máx 30 s
    const delay = Math.min(
      CONFIG.WS_RECONNECT_INTERVAL_MS * Math.pow(1.5, Math.min(this.#retryCount, 6)),
      30_000
    );
    this.#retryCount++;
    this.#retryTimer = setTimeout(() => this.connect(), delay);
  }

  #setStatus(newStatus) {
    if (this.#status === newStatus) return;
    this.#status = newStatus;
    this.dispatchEvent(new CustomEvent('ws:status', { detail: { status: newStatus } }));
  }
}

/** Instancia singleton del cliente WebSocket */
export const wsClient = new WebSocketClient();
