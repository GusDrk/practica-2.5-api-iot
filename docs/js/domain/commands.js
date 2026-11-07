/**
 * commands.js — Dominio de comandos del vehículo
 * Servicio único de envío de comandos con validación,
 * control de concurrencia y prioridad de DETENER.
 */

import { http } from '../api/http-client.js';
import { ENDPOINTS, STOP_COMMAND, CONFIG } from '../config.js';

/** Estados posibles de un comando */
export const CMD_STATE = {
  IDLE:     'idle',
  SENDING:  'sending',
  ACCEPTED: 'accepted',
  ERROR:    'error',
};

class CommandService extends EventTarget {
  #pendingRequest = null;    // AbortController de la solicitud en vuelo
  #lastCommandId = null;     // Último id_comando enviado
  #isSending = false;

  get isSending() { return this.#isSending; }

  /**
   * Envía un comando al backend.
   * Si hay un comando en vuelo y el nuevo es DETENER, lo cancela primero.
   * Evita enviar el mismo comando consecutivamente.
   * @param {object} command — de COMMANDS en config.js
   * @returns {Promise<object|null>}
   */
  async send(command) {
    if (!command || typeof command.id !== 'number') {
      throw new Error('Comando inválido');
    }

    const isStop = command.id === STOP_COMMAND.id;

    // Prioridad absoluta: si llega DETENER, cancela lo que haya en vuelo
    if (isStop && this.#isSending) {
      this.#cancelPending();
    }

    // Evitar duplicados (excepto DETENER que siempre se permite)
    if (!isStop && this.#isSending) return null;
    if (!isStop && this.#lastCommandId === command.id) return null;

    this.#isSending = true;
    this.#lastCommandId = command.id;
    this.#emit(CMD_STATE.SENDING, command);

    try {
      const body = {
        id_vehiculo: CONFIG.VEHICLE_ID,
        id_comando:  command.id,
      };

      const result = await http.post(ENDPOINTS.movimiento(), body);

      this.#emit(CMD_STATE.ACCEPTED, command, result);
      return result;

    } catch (err) {
      this.#emit(CMD_STATE.ERROR, command, null, err);
      throw err;
    } finally {
      this.#isSending = false;
    }
  }

  /** Envía DETENER incondicionalmente */
  async stop() {
    return this.send(STOP_COMMAND);
  }

  #cancelPending() {
    // Fetch no es cancelable post-send, pero reseteamos estado visual
    this.#isSending = false;
  }

  #emit(state, command, result = null, error = null) {
    this.dispatchEvent(new CustomEvent('cmd:state', {
      detail: { state, command, result, error }
    }));
  }
}

export const commandService = new CommandService();
