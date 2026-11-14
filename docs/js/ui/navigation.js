/**
 * navigation.js — Navegación entre vistas CONTROL, MONITOREO y ADMINISTRACIÓN
 * Alterna entre paneles sin recargar la página para mantener viva la sesión WebSocket.
 */

import { monitoringService } from '../domain/monitoring.js';

export class Navigation {
  #tabs = {};
  #views = {};
  #currentView = 'control';

  constructor() {
    this.#tabs = {
      control: document.getElementById('tab-control'),
      monitoring: document.getElementById('tab-monitoring'),
      admin: document.getElementById('tab-admin')
    };

    this.#views = {
      control: document.getElementById('view-control'),
      monitoring: document.getElementById('view-monitoring'),
      admin: document.getElementById('view-admin')
    };

    this.#initEvents();
  }

  get currentView() { return this.#currentView; }

  #initEvents() {
    Object.keys(this.#tabs).forEach(viewName => {
      const tab = this.#tabs[viewName];
      if (tab) {
        tab.addEventListener('click', () => this.switchView(viewName));
      }
    });

    // Navegación por teclado (flechas izquierda/derecha)
    window.addEventListener('keydown', (e) => {
      const keys = ['control', 'monitoring', 'admin'];
      const activeIdx = keys.findIndex(k => document.activeElement === this.#tabs[k]);
      if (activeIdx !== -1) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          const nextIdx = (activeIdx + 1) % keys.length;
          this.switchView(keys[nextIdx]);
          this.#tabs[keys[nextIdx]]?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          const prevIdx = (activeIdx - 1 + keys.length) % keys.length;
          this.switchView(keys[prevIdx]);
          this.#tabs[keys[prevIdx]]?.focus();
        }
      }
    });
  }

  /**
   * Cambia de vista de manera accesible y reactiva.
   * @param {'control'|'monitoring'|'admin'} viewName 
   */
  switchView(viewName) {
    if (viewName === this.#currentView) return;
    this.#currentView = viewName;

    Object.keys(this.#tabs).forEach(name => {
      const isTarget = name === viewName;
      const tab = this.#tabs[name];
      const view = this.#views[name];

      if (tab) {
        tab.classList.toggle('active', isTarget);
        tab.setAttribute('aria-selected', String(isTarget));
        tab.tabIndex = isTarget ? 0 : -1;
      }

      if (view) {
        view.hidden = !isTarget;
        view.classList.toggle('active', isTarget);
      }
    });

    // Si entra a Monitoreo, cargar datos frescos de REST
    if (viewName === 'monitoring') {
      monitoringService.loadInitialData().catch(() => {});
    }

    // Disparar evento para que el módulo de administración cargue datos si es necesario
    if (viewName === 'admin') {
      window.dispatchEvent(new CustomEvent('view:admin:active'));
    }
  }
}
