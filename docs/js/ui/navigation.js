/**
 * navigation.js — Navegación entre vistas CONTROL y MONITOREO
 * Alterna entre paneles sin recargar la página para mantener viva la sesión WebSocket.
 */

import { monitoringService } from '../domain/monitoring.js';

export class Navigation {
  #tabControl;
  #tabMonitoring;
  #viewControl;
  #viewMonitoring;
  #currentView = 'control';

  constructor() {
    this.#tabControl      = document.getElementById('tab-control');
    this.#tabMonitoring   = document.getElementById('tab-monitoring');
    this.#viewControl     = document.getElementById('view-control');
    this.#viewMonitoring  = document.getElementById('view-monitoring');

    this.#initEvents();
  }

  get currentView() { return this.#currentView; }

  #initEvents() {
    if (this.#tabControl) {
      this.#tabControl.addEventListener('click', () => this.switchView('control'));
    }
    if (this.#tabMonitoring) {
      this.#tabMonitoring.addEventListener('click', () => this.switchView('monitoring'));
    }

    // Navegación por teclado (flechas izquierda/derecha)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === this.#tabControl && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        this.switchView('monitoring');
        this.#tabMonitoring?.focus();
      } else if (document.activeElement === this.#tabMonitoring && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        this.switchView('control');
        this.#tabControl?.focus();
      }
    });
  }

  /**
   * Cambia de vista de manera accesible y reactiva.
   * @param {'control'|'monitoring'} viewName 
   */
  switchView(viewName) {
    if (viewName === this.#currentView) return;
    this.#currentView = viewName;

    const isControl = viewName === 'control';

    // 1. Actualizar estado de las pestañas
    if (this.#tabControl) {
      this.#tabControl.classList.toggle('active', isControl);
      this.#tabControl.setAttribute('aria-selected', String(isControl));
      this.#tabControl.tabIndex = isControl ? 0 : -1;
    }
    if (this.#tabMonitoring) {
      this.#tabMonitoring.classList.toggle('active', !isControl);
      this.#tabMonitoring.setAttribute('aria-selected', String(!isControl));
      this.#tabMonitoring.tabIndex = !isControl ? 0 : -1;
    }

    // 2. Alternar visibilidad de los paneles
    if (this.#viewControl) {
      this.#viewControl.hidden = !isControl;
      this.#viewControl.classList.toggle('active', isControl);
    }
    if (this.#viewMonitoring) {
      this.#viewMonitoring.hidden = isControl;
      this.#viewMonitoring.classList.toggle('active', !isControl);
    }

    // 3. Si entra a Monitoreo, cargar datos frescos de REST
    if (!isControl) {
      monitoringService.loadInitialData().catch(() => {});
    }
  }
}
