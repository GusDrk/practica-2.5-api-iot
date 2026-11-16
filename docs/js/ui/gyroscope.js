/**
 * gyroscope.js — Dirección opcional mediante la inclinación del teléfono.
 * El permiso se solicita únicamente al pulsar el botón, requisito de iOS.
 */

import { JOYSTICK_MAP } from '../config.js';
import { commandService } from '../domain/commands.js';
import { showToast } from '../utils/toast.js';

export class GyroscopeControl {
  #button;
  #status;
  #enabled = false;
  #direction = null;
  #threshold = 15;

  constructor() {
    this.#button = document.getElementById('btn-gyroscope');
    this.#status = document.getElementById('gyroscope-status');
    if (!this.#button) return;

    this.#button.addEventListener('click', () => this.#toggle());
    window.addEventListener('deviceorientation', (event) => this.#onOrientation(event));
    window.addEventListener('blur', () => this.#stop());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.#stop();
    });
  }

  async #toggle() {
    if (this.#enabled) {
      this.#disable();
      return;
    }

    if (!window.DeviceOrientationEvent) {
      showToast('Este dispositivo no cuenta con sensor de orientación.', 'warning');
      return;
    }

    try {
      // Safari/iOS exige consentimiento explícito iniciado por el usuario.
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('Permiso de movimiento no concedido');
      }
      this.#enabled = true;
      this.#button.classList.add('is-active');
      this.#button.setAttribute('aria-pressed', 'true');
      this.#button.innerHTML = '<i class="bi bi-phone-vibrate"></i> Desactivar giroscopio';
      this.#setStatus('Activo: inclina el teléfono', 'text-success');
    } catch (err) {
      showToast(err.message, 'warning');
    }
  }

  #disable() {
    this.#enabled = false;
    this.#stop();
    this.#button.classList.remove('is-active');
    this.#button.setAttribute('aria-pressed', 'false');
    this.#button.innerHTML = '<i class="bi bi-phone"></i> Activar giroscopio';
    this.#setStatus('Desactivado', 'text-muted');
  }

  #onOrientation({ beta, gamma }) {
    if (!this.#enabled || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;

    let next = null;
    if (Math.abs(gamma) >= Math.abs(beta) && Math.abs(gamma) >= this.#threshold) {
      next = gamma > 0 ? 'right' : 'left';
    } else if (Math.abs(beta) >= this.#threshold) {
      next = beta < 0 ? 'up' : 'down';
    }

    if (next === this.#direction) return;
    this.#direction = next;
    if (next) commandService.send(JOYSTICK_MAP[next]).catch(() => {});
    else commandService.stop().catch(() => {});
  }

  #stop() {
    if (!this.#enabled && this.#direction === null) return;
    this.#direction = null;
    commandService.stop().catch(() => {});
  }

  #setStatus(text, className) {
    if (!this.#status) return;
    this.#status.textContent = text;
    this.#status.className = `small ${className}`;
  }
}
