/**
 * demo.js — Dominio de DEMOs del vehículo
 * Carga demos desde la API, gestiona ejecución y estado.
 * No implementa CRUD de DEMOs.
 * No reproduce secuencias localmente; confía en el backend.
 */

import { http } from '../api/http-client.js';
import { ENDPOINTS, CONFIG } from '../config.js';

export const DEMO_STATE = {
  IDLE:      'idle',
  LOADING:   'loading',
  RUNNING:   'running',
  FINISHED:  'finished',
  ERROR:     'error',
};

class DemoService extends EventTarget {
  #state = DEMO_STATE.IDLE;
  #demos = [];
  #currentDemoId = null;

  get state()         { return this.#state; }
  get demos()         { return this.#demos; }
  get currentDemoId() { return this.#currentDemoId; }
  get isRunning()     { return this.#state === DEMO_STATE.RUNNING; }

  /** Carga las demos disponibles para el vehículo */
  async loadDemos() {
    this.#setState(DEMO_STATE.LOADING);
    try {
      const data = await http.get(ENDPOINTS.demos(CONFIG.VEHICLE_ID));
      // Solo demos activas
      this.#demos = Array.isArray(data)
        ? data.filter(d => d.activo)
        : [];
      this.#setState(DEMO_STATE.IDLE);
      this.dispatchEvent(new CustomEvent('demo:loaded', { detail: { demos: this.#demos } }));
      return this.#demos;
    } catch (err) {
      this.#setState(DEMO_STATE.ERROR);
      this.dispatchEvent(new CustomEvent('demo:error', { detail: { error: err } }));
      throw err;
    }
  }

  /** Inicia una demo */
  async execute(idDemo) {
    if (this.isRunning) {
      throw new Error('Ya hay una DEMO en ejecución');
    }
    this.#currentDemoId = idDemo;
    this.#setState(DEMO_STATE.RUNNING);

    try {
      const result = await http.post(ENDPOINTS.ejecutarDemo(), {
        id_vehiculo: CONFIG.VEHICLE_ID,
        id_demo:     idDemo,
      });
      // El backend ejecuta la demo de forma síncrona.
      // La respuesta final llega al resolver el POST.
      this.#setState(DEMO_STATE.FINISHED);
      this.dispatchEvent(new CustomEvent('demo:finished', { detail: result }));
      this.#currentDemoId = null;
      return result;
    } catch (err) {
      this.#setState(DEMO_STATE.ERROR);
      this.#currentDemoId = null;
      this.dispatchEvent(new CustomEvent('demo:error', { detail: { error: err } }));
      throw err;
    }
  }

  /**
   * Recibe eventos WebSocket relacionados con demos.
   * Actualiza estado sin re-ejecutar la secuencia localmente.
   */
  handleWsEvent(data) {
    switch (data.tipo) {
      case 'demo_movimiento':
        this.dispatchEvent(new CustomEvent('demo:step', { detail: data }));
        break;
      case 'demo_finalizada':
        if (this.isRunning) {
          this.#setState(DEMO_STATE.FINISHED);
          this.#currentDemoId = null;
          this.dispatchEvent(new CustomEvent('demo:finished', { detail: data }));
        }
        break;
    }
  }

  #setState(newState) {
    this.#state = newState;
    this.dispatchEvent(new CustomEvent('demo:state', { detail: { state: newState } }));
  }
}

export const demoService = new DemoService();
