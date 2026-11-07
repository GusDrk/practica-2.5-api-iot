/**
 * http-client.js — Cliente HTTP centralizado
 * Fetch + async/await, timeout via AbortController,
 * manejo de errores HTTP y de red, parseo JSON.
 */

import { CONFIG } from '../config.js';

/**
 * Realiza una petición HTTP con timeout y manejo de errores.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} JSON parseado
 * @throws {ApiError}
 */
export async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        detail = err.detail || err.message || detail;
      } catch {
        // No es JSON, usar status text
        detail = response.statusText || detail;
      }
      throw new ApiError(detail, response.status);
    }

    // 204 No Content
    if (response.status === 204) return null;

    return await response.json();

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new ApiError('La solicitud superó el tiempo de espera', 408);
    }
    if (err instanceof ApiError) throw err;

    // Error de red (sin conexión, CORS, etc.)
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }
}

export const http = {
  get:  (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
};

/** Error tipado de la API */
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
