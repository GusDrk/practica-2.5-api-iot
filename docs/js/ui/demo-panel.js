/**
 * demo-panel.js — Panel de selección y ejecución de DEMOs
 * Carga DEMOs de la API, permite seleccionar e iniciar.
 * No implementa CRUD. No reproduce secuencias localmente.
 * Cancelar no existe en el backend → botón deshabilitado con tooltip.
 */

import { demoService, DEMO_STATE } from '../domain/demo.js';
import { messageService } from './messages.js';

export class DemoPanel {
  #select;
  #btnStart;
  #btnCancel;
  #statusEl;

  constructor() {
    this.#select    = document.getElementById('demo-select');
    this.#btnStart  = document.getElementById('btn-demo-start');
    this.#btnCancel = document.getElementById('btn-demo-cancel');
    this.#statusEl  = document.getElementById('demo-status');

    // Cancelar no existe en el backend
    if (this.#btnCancel) {
      this.#btnCancel.disabled = true;
      this.#btnCancel.title    = 'Cancelación no disponible en esta versión del backend';
    }

    this.#bindEvents();
    this.#loadDemos();
  }

  #bindEvents() {
    this.#btnStart?.addEventListener('click', () => this.#startDemo());

    demoService.addEventListener('demo:loaded', (e) => {
      this.#populateSelect(e.detail.demos);
    });

    demoService.addEventListener('demo:state', (e) => {
      this.#onStateChange(e.detail.state);
    });

    demoService.addEventListener('demo:step', (e) => {
      const d = e.detail;
      this.#setStatus(
        `▶ Paso ${d.orden}: ${d.comando ?? ''} · duración ${d.duracion_ms}ms`,
        'info'
      );
    });

    demoService.addEventListener('demo:finished', (e) => {
      const d = e.detail;
      const total = d.total_movimientos ?? '?';
      messageService.success(`DEMO finalizada · ${total} movimientos ejecutados`);
      this.#setStatus(`✔ Finalizada · ${total} movimientos`, 'success');
    });

    demoService.addEventListener('demo:error', (e) => {
      messageService.error(`Error en DEMO: ${e.detail.error?.message ?? 'Error desconocido'}`);
      this.#setStatus('Error al ejecutar la DEMO', 'error');
    });
  }

  async #loadDemos() {
    this.#setStatus('Cargando DEMOs…', 'info');
    try {
      await demoService.loadDemos();
      if (!demoService.demos.length) {
        this.#setStatus('No hay DEMOs disponibles', 'warning');
      } else {
        this.#setStatus('Selecciona una DEMO', '');
      }
    } catch {
      this.#setStatus('No se pudieron cargar las DEMOs', 'error');
    }
  }

  #populateSelect(demos) {
    if (!this.#select) return;
    this.#select.innerHTML = '<option value="">— Seleccionar DEMO —</option>';
    for (const demo of demos) {
      const opt = document.createElement('option');
      opt.value       = demo.id_demo;
      opt.textContent = demo.nombre;
      opt.title       = demo.descripcion ?? '';
      this.#select.appendChild(opt);
    }
    if (this.#btnStart) this.#btnStart.disabled = !demos.length;
  }

  async #startDemo() {
    const idDemo = parseInt(this.#select?.value, 10);
    if (!idDemo) {
      messageService.warning('Selecciona una DEMO antes de iniciar');
      return;
    }
    if (demoService.isRunning) {
      messageService.warning('Ya hay una DEMO en ejecución');
      return;
    }
    try {
      await demoService.execute(idDemo);
    } catch (err) {
      // El error ya fue manejado en demo:error
    }
  }

  #onStateChange(state) {
    const isRunning = state === DEMO_STATE.RUNNING;
    if (this.#btnStart)  this.#btnStart.disabled  = isRunning;
    if (this.#select)    this.#select.disabled     = isRunning;

    if (isRunning) {
      this.#setStatus('⏳ DEMO en ejecución…', 'info');
      messageService.info('DEMO iniciada — el backend controla la secuencia');
    }
  }

  #setStatus(text, type = '') {
    if (!this.#statusEl) return;
    this.#statusEl.textContent = text;
    this.#statusEl.className   = `demo-status-text ${type ? 'status-' + type : ''}`;
  }
}
