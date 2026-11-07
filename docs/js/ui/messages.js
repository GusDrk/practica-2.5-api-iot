/**
 * messages.js — Sistema de mensajes de acción (toast/snackbar)
 * Muestra notificaciones breves de estado al usuario.
 */

export class MessageService {
  #container;
  #queue = [];
  #isShowing = false;

  constructor() {
    this.#container = document.getElementById('toast-container');
    if (!this.#container) {
      this.#container = document.createElement('div');
      this.#container.id = 'toast-container';
      document.body.appendChild(this.#container);
    }
  }

  /**
   * @param {string} text
   * @param {'info'|'success'|'error'|'warning'} type
   * @param {number} duration ms
   */
  show(text, type = 'info', duration = 3000) {
    this.#queue.push({ text, type, duration });
    if (!this.#isShowing) this.#next();
  }

  success(text, duration = 2500) { this.show(text, 'success', duration); }
  error(text, duration = 4000)   { this.show(text, 'error', duration); }
  info(text, duration = 2500)    { this.show(text, 'info', duration); }
  warning(text, duration = 3000) { this.show(text, 'warning', duration); }

  #next() {
    if (!this.#queue.length) { this.#isShowing = false; return; }
    this.#isShowing = true;
    const { text, type, duration } = this.#queue.shift();
    this.#display(text, type, duration);
  }

  #display(text, type, duration) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = text;

    this.#container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('toast-visible'));
    });

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.addEventListener('transitionend', () => {
        toast.remove();
        this.#next();
      }, { once: true });
    }, duration);
  }
}

export const messageService = new MessageService();
