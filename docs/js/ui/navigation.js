/**
 * Navegación principal según la sesión activa.
 * Antes del acceso solo se muestra el formulario de inicio de sesión.
 */

import { monitoringService } from '../domain/monitoring.js';

export class Navigation {
  #tabs = {};
  #views = {};
  #currentView = 'admin';

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
    this.#applyRole(this.#savedUser());
  }

  get currentView() { return this.#currentView; }

  #savedUser() {
    try { return JSON.parse(localStorage.getItem('iot_user')); } catch (_) { return null; }
  }

  #initEvents() {
    Object.entries(this.#tabs).forEach(([viewName, tab]) => {
      tab?.addEventListener('click', () => this.switchView(viewName));
    });

    window.addEventListener('auth:changed', (event) => {
      this.#applyRole(event.detail?.user ?? null);
    });

    window.addEventListener('keydown', (e) => {
      const keys = Object.keys(this.#tabs).filter(name => !this.#tabs[name].hidden);
      const activeIdx = keys.findIndex(name => document.activeElement === this.#tabs[name]);
      if (activeIdx === -1) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const next = keys[(activeIdx + 1) % keys.length];
        this.switchView(next);
        this.#tabs[next]?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const previous = keys[(activeIdx - 1 + keys.length) % keys.length];
        this.switchView(previous);
        this.#tabs[previous]?.focus();
      }
    });
  }

  #applyRole(user) {
    const roleId = user?.rol_id;
    const visible = roleId === 1
      ? ['admin']
      : roleId === 2
        ? ['control', 'monitoring', 'admin']
        : roleId === 3
          ? ['control', 'monitoring']
          : [];

    Object.entries(this.#tabs).forEach(([name, tab]) => {
      if (tab) tab.hidden = !visible.includes(name);
    });

    const destination = roleId === 1 || !roleId ? 'admin' : 'control';
    this.switchView(destination, true);
  }

  switchView(viewName, force = false) {
    if (!force && viewName === this.#currentView) return;
    if (!force && this.#tabs[viewName]?.hidden) return;
    this.#currentView = viewName;

    Object.keys(this.#tabs).forEach(name => {
      const isTarget = name === viewName;
      const tab = this.#tabs[name];
      const view = this.#views[name];
      if (tab) {
        tab.classList.toggle('active', isTarget);
        tab.setAttribute('aria-selected', String(isTarget));
        tab.tabIndex = isTarget && !tab.hidden ? 0 : -1;
      }
      if (view) {
        view.hidden = !isTarget;
        view.classList.toggle('active', isTarget);
      }
    });

    if (viewName === 'monitoring') monitoringService.loadInitialData().catch(() => {});
    if (viewName === 'admin') window.dispatchEvent(new CustomEvent('view:admin:active'));
  }
}
