/**
 * monitoring.js — Dominio de Monitoreo del vehículo
 * Gestiona el último estado reportado y los diez movimientos persistidos.
 * Reconcilia eventos WebSocket en tiempo real con la persistencia REST en Amazon RDS.
 */

import { http } from '../api/http-client.js';
import { ENDPOINTS, CONFIG } from '../config.js';

class MonitoringService extends EventTarget {
  #ultimoEstado = null;
  #historial = [];
  #isLoadingEstado = false;
  #isLoadingHistorial = false;
  #syncDebounceTimer = null;

  get ultimoEstado() { return this.#ultimoEstado; }
  get historial() { return this.#historial; }
  get isLoadingEstado() { return this.#isLoadingEstado; }
  get isLoadingHistorial() { return this.#isLoadingHistorial; }

  /**
   * Carga inicial completa de estado e historial desde la API REST.
   */
  async loadInitialData() {
    await Promise.allSettled([
      this.loadUltimoEstado(),
      this.loadHistorial(),
    ]);
  }

  /**
   * Consulta por REST el último estado real del vehículo.
   * Endpoint: GET /vehiculos/{id}/estado
   */
  async loadUltimoEstado() {
    this.#isLoadingEstado = true;
    try {
      const data = await http.get(ENDPOINTS.estado(CONFIG.VEHICLE_ID));
      // La API devuelve un array con un registro: [ { id_vehiculo, vehiculo, id_comando, comando, codigo, conectado, fecha_actualizacion } ]
      if (Array.isArray(data) && data.length > 0) {
        this.#ultimoEstado = data[0];
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        this.#ultimoEstado = data;
      }
      this.dispatchEvent(new CustomEvent('monitoring:state-change', {
        detail: { estado: this.#ultimoEstado, source: 'REST' }
      }));
      return this.#ultimoEstado;
    } catch (err) {
      this.dispatchEvent(new CustomEvent('monitoring:state-error', {
        detail: { error: err }
      }));
      throw err;
    } finally {
      this.#isLoadingEstado = false;
    }
  }

  /**
   * Consulta por REST los últimos 10 movimientos individuales persistidos.
   * Endpoint: GET /vehiculos/{id}/historial
   */
  async loadHistorial() {
    this.#isLoadingHistorial = true;
    try {
      const data = await http.get(ENDPOINTS.historial(CONFIG.VEHICLE_ID));
      if (Array.isArray(data)) {
        // Ordenar por id_historial descendente y recortar a máximo 10
        const sorted = [...data].sort((a, b) => (b.id_historial ?? 0) - (a.id_historial ?? 0));
        this.#historial = sorted.slice(0, 10);
      } else {
        this.#historial = [];
      }
      this.dispatchEvent(new CustomEvent('monitoring:history-change', {
        detail: { historial: this.#historial, source: 'REST' }
      }));
      return this.#historial;
    } catch (err) {
      this.dispatchEvent(new CustomEvent('monitoring:history-error', {
        detail: { error: err }
      }));
      throw err;
    } finally {
      this.#isLoadingHistorial = false;
    }
  }

  /**
   * Sincroniza el historial persistido con un leve retraso para dar tiempo a que
   * la transacción en Amazon RDS MySQL termine de confirmar.
   */
  scheduleHistorySync() {
    clearTimeout(this.#syncDebounceTimer);
    this.#syncDebounceTimer = setTimeout(() => {
      this.loadHistorial().catch(() => {});
    }, 600);
  }

  /**
   * Procesa eventos en tiempo real provenientes del WebSocket.
   * Actualiza inmediatamente el último estado y programa reconciliación del historial.
   * @param {object} data — Payload recibido por WSS
   */
  handleWsEvent(data) {
    if (!data || typeof data !== 'object') return;

    // Filtrar si el mensaje pertenece a otro vehículo
    if (data.id_vehiculo && Number(data.id_vehiculo) !== Number(CONFIG.VEHICLE_ID)) {
      return;
    }

    if (data.tipo === 'movimiento') {
      // 1. Actualizar de inmediato la tarjeta destacada con el movimiento recibido
      const nuevoEstado = {
        id_vehiculo: data.id_vehiculo ?? CONFIG.VEHICLE_ID,
        comando: data.comando,
        codigo: data.codigo,
        id_comando: data.id_comando,
        origen: data.origen ?? 'MANUAL',
        fecha_actualizacion: new Date().toISOString(),
        en_vivo: true,
      };
      this.#ultimoEstado = nuevoEstado;

      this.dispatchEvent(new CustomEvent('monitoring:state-change', {
        detail: { estado: this.#ultimoEstado, source: 'WSS' }
      }));

      // 2. Reconciliar la tabla de 10 movimientos con el backend en RDS
      this.scheduleHistorySync();
    } 
    else if (data.tipo === 'demo_movimiento') {
      // Movimiento interno de DEMO: refleja el estado en vivo, pero NO contamina el historial individual
      const nuevoEstado = {
        id_vehiculo: data.id_vehiculo ?? CONFIG.VEHICLE_ID,
        comando: data.comando,
        codigo: data.codigo,
        origen: 'DEMO',
        fecha_actualizacion: new Date().toISOString(),
        en_vivo: true,
      };
      this.#ultimoEstado = nuevoEstado;

      this.dispatchEvent(new CustomEvent('monitoring:state-change', {
        detail: { estado: this.#ultimoEstado, source: 'WSS_DEMO' }
      }));
    }
  }

  /**
   * Recuperación tras reconexión del WebSocket para resincronizar cualquier evento perdido.
   */
  handleWsReconnect() {
    this.loadInitialData().catch(() => {});
  }
}

export const monitoringService = new MonitoringService();
