/**
 * buttons.js — Botones secundarios del panel de control
 * Subir/Bajar Garra, Bocina. Reutilizan commandService.
 * Estados: normal, enviando, aceptado, error.
 */

import { COMMANDS } from '../config.js';
import { commandService, CMD_STATE } from '../domain/commands.js';

/** Mapa id_comando → selector del botón en el DOM */
const BUTTON_MAP = [
  { command: COMMANDS.SUBIR_GARRA, selector: '#btn-subir-garra' },
  { command: COMMANDS.BAJAR_GARRA, selector: '#btn-bajar-garra' },
  { command: COMMANDS.BOCINA,      selector: '#btn-bocina' },
];

export class SecondaryButtons {
  #buttons = [];

  constructor() {
    for (const { command, selector } of BUTTON_MAP) {
      const el = document.querySelector(selector);
      if (!el) continue;

      this.#buttons.push({ el, command });

      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (el.disabled || el.classList.contains('btn-sending')) return;
        commandService.send(command);
      });

      // Teclado: Enter y Space ya disparan click en <button>
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') el.click();
      });
    }

    commandService.addEventListener('cmd:state', (e) => {
      this.#onCmdState(e.detail);
    });
  }

  #onCmdState({ state, command }) {
    const btn = this.#buttons.find(b => b.command.id === command.id);
    if (!btn) return;

    btn.el.classList.remove('btn-sending', 'btn-accepted', 'btn-error');

    switch (state) {
      case CMD_STATE.SENDING:
        btn.el.classList.add('btn-sending');
        btn.el.disabled = true;
        break;
      case CMD_STATE.ACCEPTED:
        btn.el.classList.add('btn-accepted');
        btn.el.disabled = false;
        setTimeout(() => btn.el.classList.remove('btn-accepted'), 800);
        break;
      case CMD_STATE.ERROR:
        btn.el.classList.add('btn-error');
        btn.el.disabled = false;
        setTimeout(() => btn.el.classList.remove('btn-error'), 1500);
        break;
      default:
        btn.el.disabled = false;
    }
  }

  /** Habilita o deshabilita todos los botones secundarios */
  setDisabled(disabled) {
    this.#buttons.forEach(b => { b.el.disabled = disabled; });
  }
}
