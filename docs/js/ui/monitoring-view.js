/**
 * monitoring-view.js — Renderizado de la vista MONITOREO
 * - Tarjeta destacada del último estado / movimiento reportado
 * - Tabla semántica responsiva de los últimos 10 movimientos persistidos
 */

import { monitoringService } from '../domain/monitoring.js';
import { formatDateTime } from '../utils/date-formatter.js';
import { formatCommandName, getCommandIcon } from '../utils/command-formatter.js';

export class MonitoringView {
  // Elementos de la tarjeta destacada
  #cmdNameEl;
  #cmdIconEl;
  #cmdCodeEl;
  #cmdOriginEl;
  #cmdDateEl;
  #cmdTimeEl;
  #cmdBadgeEl;

  // Elementos de la tabla
  #tableBodyEl;
  #tableStatusEl;
  #refreshBtnEl;

  constructor() {
    this.#initElements();
    this.#bindEvents();
  }

  #initElements() {
    // Tarjeta último movimiento
    this.#cmdNameEl   = document.getElementById('mon-last-cmd-name');
    this.#cmdIconEl   = document.getElementById('mon-last-cmd-icon');
    this.#cmdCodeEl   = document.getElementById('mon-last-cmd-code');
    this.#cmdOriginEl = document.getElementById('mon-last-cmd-origin');
    this.#cmdDateEl   = document.getElementById('mon-last-cmd-date');
    this.#cmdTimeEl   = document.getElementById('mon-last-cmd-time');
    this.#cmdBadgeEl  = document.getElementById('mon-last-cmd-badge');

    // Tabla
    this.#tableBodyEl   = document.getElementById('mon-history-tbody');
    this.#tableStatusEl = document.getElementById('mon-history-status');
    this.#refreshBtnEl  = document.getElementById('mon-btn-refresh');
  }

  #bindEvents() {
    // Escuchar cambios de estado desde el servicio de monitoreo
    monitoringService.addEventListener('monitoring:state-change', (e) => {
      this.renderUltimoEstado(e.detail.estado, e.detail.source);
    });

    monitoringService.addEventListener('monitoring:state-error', (e) => {
      this.renderEstadoError(e.detail.error);
    });

    monitoringService.addEventListener('monitoring:history-change', (e) => {
      this.renderHistorial(e.detail.historial);
    });

    monitoringService.addEventListener('monitoring:history-error', (e) => {
      this.renderHistorialError(e.detail.error);
    });

    // Botón manual de refrescar
    if (this.#refreshBtnEl) {
      this.#refreshBtnEl.addEventListener('click', () => {
        this.#refreshBtnEl.disabled = true;
        this.showLoadingHistory();
        monitoringService.loadInitialData()
          .finally(() => {
            if (this.#refreshBtnEl) this.#refreshBtnEl.disabled = false;
          });
      });
    }
  }

  /**
   * Renderiza la tarjeta visual destacada del último movimiento.
   */
  renderUltimoEstado(estado, source = 'REST') {
    if (!estado) {
      if (this.#cmdNameEl) this.#cmdNameEl.textContent = 'Sin datos';
      return;
    }

    const { fecha, hora } = formatDateTime(estado.fecha_actualizacion || estado.fecha_hora);
    const cmdCode = estado.codigo ?? estado.id_comando;
    const cmdFriendly = formatCommandName(estado.comando, cmdCode);
    const cmdIcon = getCommandIcon(estado.comando, cmdCode);

    if (this.#cmdNameEl)   this.#cmdNameEl.textContent   = cmdFriendly;
    if (this.#cmdIconEl)   this.#cmdIconEl.textContent   = cmdIcon;
    if (this.#cmdCodeEl)   this.#cmdCodeEl.textContent   = `Código ${cmdCode ?? '--'}`;
    if (this.#cmdOriginEl) this.#cmdOriginEl.textContent = `Origen: ${estado.origen || 'MANUAL'}`;
    if (this.#cmdDateEl)   this.#cmdDateEl.textContent   = fecha;
    if (this.#cmdTimeEl)   this.#cmdTimeEl.textContent   = hora;

    if (this.#cmdBadgeEl) {
      const isLive = source === 'WSS' || source === 'WSS_DEMO';
      this.#cmdBadgeEl.textContent = isLive ? '📡 En vivo (WSS)' : '💾 Persistido (RDS)';
      this.#cmdBadgeEl.className   = `mon-status-badge ${isLive ? 'live' : 'persisted'}`;
    }
  }

  renderEstadoError() {
    if (this.#cmdNameEl) this.#cmdNameEl.textContent = 'Error al cargar';
    if (this.#cmdBadgeEl) {
      this.#cmdBadgeEl.textContent = 'Error de red';
      this.#cmdBadgeEl.className = 'mon-status-badge error';
    }
  }

  /**
   * Muestra estado de carga en la tabla.
   */
  showLoadingHistory() {
    if (this.#tableStatusEl) {
      this.#tableStatusEl.textContent = 'Cargando últimos movimientos…';
      this.#tableStatusEl.style.display = 'block';
    }
  }

  /**
   * Renderiza las filas de la tabla de 10 movimientos persistidos.
   * @param {Array} historial 
   */
  renderHistorial(historial) {
    if (!this.#tableBodyEl) return;

    if (!Array.isArray(historial) || historial.length === 0) {
      this.#tableBodyEl.innerHTML = '';
      if (this.#tableStatusEl) {
        this.#tableStatusEl.textContent = 'Sin movimientos registrados en Amazon RDS';
        this.#tableStatusEl.style.display = 'block';
      }
      return;
    }

    if (this.#tableStatusEl) {
      this.#tableStatusEl.style.display = 'none';
    }

    // Limpiar tabla antes de renderizar
    this.#tableBodyEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    historial.forEach((item, index) => {
      const { fecha, hora } = formatDateTime(item.fecha_hora);

      const tr = document.createElement('tr');
      tr.className = 'history-row';

      // 1. Columna # (Numeración del 1 al 10)
      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = String(index + 1);

      // 2. Columna Movimiento
      const tdMov = document.createElement('td');
      tdMov.className = 'col-mov';

      const movBadge = document.createElement('span');
      movBadge.className = `mov-badge mov-${(item.comando || '').toLowerCase().replace(/_/g, '-')}`;
      movBadge.textContent = formatCommandName(item.comando, item.codigo);

      const codeSmall = document.createElement('span');
      codeSmall.className = 'mov-code';
      codeSmall.textContent = ` (cód. ${item.codigo ?? '--'})`;

      tdMov.appendChild(movBadge);
      tdMov.appendChild(codeSmall);

      // 3. Columna Fecha (DD/MM/AAAA)
      const tdFecha = document.createElement('td');
      tdFecha.className = 'col-fecha';
      tdFecha.textContent = fecha;

      // 4. Columna Hora (HH:MM:SS)
      const tdHora = document.createElement('td');
      tdHora.className = 'col-hora';
      tdHora.textContent = hora;

      // 5. Columna Origen
      const tdOrigen = document.createElement('td');
      tdOrigen.className = 'col-origen';
      const origSpan = document.createElement('span');
      origSpan.className = `origin-badge origin-${(item.origen || 'manual').toLowerCase()}`;
      origSpan.textContent = item.origen || 'MANUAL';
      tdOrigen.appendChild(origSpan);

      tr.appendChild(tdNum);
      tr.appendChild(tdMov);
      tr.appendChild(tdFecha);
      tr.appendChild(tdHora);
      tr.appendChild(tdOrigen);

      fragment.appendChild(tr);
    });

    this.#tableBodyEl.appendChild(fragment);
  }

  renderHistorialError(err) {
    if (this.#tableStatusEl) {
      this.#tableStatusEl.textContent = `Error al consultar historial: ${err?.message || 'Falla de red'}`;
      this.#tableStatusEl.style.display = 'block';
    }
  }
}
