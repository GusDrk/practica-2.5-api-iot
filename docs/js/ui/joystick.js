/**
 * joystick.js — Componente joystick circular táctil
 * Pointer Events API: funciona con mouse y pantallas táctiles.
 * Mapea 8 zonas angulares → 4 direcciones + neutral.
 * Envía comandos solo en transición de dirección, no por píxel.
 * Al soltar/perder puntero → envía DETENER.
 */

import { JOYSTICK_MAP } from '../config.js';
import { commandService } from '../domain/commands.js';

export class Joystick {
  #el;           // Contenedor raíz
  #thumb;        // Elemento del puck
  #active = false;
  #currentDir = null;
  #pointerId = null;

  // Límites de movimiento (radio del contenedor - radio del puck)
  #maxRadius = 0;

  constructor(containerSelector) {
    this.#el    = document.querySelector(containerSelector);
    this.#thumb = this.#el.querySelector('.joystick-thumb');

    if (!this.#el || !this.#thumb) {
      throw new Error(`Joystick: elemento '${containerSelector}' no encontrado`);
    }

    this.#bindEvents();
    this.#calcRadius();

    window.addEventListener('resize', () => this.#calcRadius(), { passive: true });
  }

  #calcRadius() {
    const r  = this.#el.getBoundingClientRect();
    const tr = this.#thumb.getBoundingClientRect();
    this.#maxRadius = (r.width / 2) - (tr.width / 2);
  }

  #bindEvents() {
    this.#el.addEventListener('pointerdown', this.#onDown.bind(this));
    this.#el.addEventListener('pointermove', this.#onMove.bind(this));
    this.#el.addEventListener('pointerup',   this.#onRelease.bind(this));
    this.#el.addEventListener('pointercancel', this.#onRelease.bind(this));
    this.#el.addEventListener('pointerleave', this.#onRelease.bind(this));
  }

  #onDown(e) {
    if (this.#active) return;
    this.#active    = true;
    this.#pointerId = e.pointerId;
    this.#el.setPointerCapture(e.pointerId);
    this.#processPosition(e);
  }

  #onMove(e) {
    if (!this.#active || e.pointerId !== this.#pointerId) return;
    this.#processPosition(e);
  }

  #onRelease(e) {
    if (!this.#active) return;
    if (e.pointerId !== undefined && e.pointerId !== this.#pointerId) return;

    this.#active    = false;
    this.#pointerId = null;
    this.#resetThumb();

    // Cambio a dirección neutral → enviar DETENER
    if (this.#currentDir !== null) {
      this.#currentDir = null;
      commandService.stop();
    }
  }

  #processPosition(e) {
    const rect   = this.#el.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = e.clientX - cx;
    const dy     = e.clientY - cy;
    const dist   = Math.hypot(dx, dy);
    const angle  = Math.atan2(dy, dx); // radianes, 0 = derecha

    // Desplazar puck dentro del radio
    const clampedDist = Math.min(dist, this.#maxRadius);
    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;
    this.#thumb.style.transform = `translate(${nx}px, ${ny}px)`;

    // Zona neutral: si dist < 25% del radio, detenerse
    const deadZone = this.#maxRadius * 0.25;
    if (dist < deadZone) {
      this.#changeDirection(null);
      return;
    }

    // Mapa de ángulos a 4 direcciones
    // atan2 con dy,dx: arriba = -π/2, abajo = π/2, izq = π, der = 0
    const deg = (angle * 180 / Math.PI + 360) % 360; // 0–360
    let dir;
    if      (deg >= 315 || deg < 45)  dir = 'right';
    else if (deg >= 45  && deg < 135) dir = 'down';
    else if (deg >= 135 && deg < 225) dir = 'left';
    else                               dir = 'up';

    this.#changeDirection(dir);
  }

  #changeDirection(dir) {
    if (dir === this.#currentDir) return; // Sin cambio, no enviar
    this.#currentDir = dir;

    if (dir === null) {
      commandService.stop();
    } else {
      const command = JOYSTICK_MAP[dir];
      if (command) commandService.send(command);
    }
  }

  #resetThumb() {
    this.#thumb.style.transform = 'translate(0px, 0px)';
  }
}
