/**
 * config.js — Configuración central de la aplicación IoT Control
 * Modifica solo este archivo para apuntar a otro backend.
 */

export const CONFIG = {
  /** URL base de la API REST (sin barra final) con HTTPS */
  API_BASE_URL: 'https://carroiotgrua.duckdns.org',

  /** URL del servidor WebSocket con WSS */
  WS_URL: 'wss://carroiotgrua.duckdns.org/ws',

  /** Identificador del vehículo en la base de datos */
  VEHICLE_ID: 1,

  /** Tiempo máximo de espera para peticiones HTTP (ms) */
  REQUEST_TIMEOUT_MS: 8000,

  /** Intervalo de reconexión WebSocket (ms) */
  WS_RECONNECT_INTERVAL_MS: 3000,

  /** Número máximo de reintentos de reconexión (-1 = ilimitado) */
  WS_MAX_RETRIES: -1,

  /** Intervalo de verificación de salud de la API (ms) */
  HEALTH_CHECK_INTERVAL_MS: 15000,
};

/**
 * Catálogo de comandos real del vehículo.
 * Fuente: GET /vehiculos/1/comandos
 * Mapeo de dirección joystick → id_comando.
 */
export const COMMANDS = {
  AVANZAR:       { id: 1, codigo: 1, nombre: 'AVANZAR',       descripcion: 'W: activar salida Q5' },
  RETROCEDER:    { id: 2, codigo: 2, nombre: 'RETROCEDER',    descripcion: 'S: activar salida Q4' },
  GIRAR_IZQ:     { id: 3, codigo: 3, nombre: 'GIRAR_IZQUIERDA', descripcion: 'A: activar salida Q7' },
  GIRAR_DER:     { id: 4, codigo: 4, nombre: 'GIRAR_DERECHA', descripcion: 'D: activar salida Q6' },
  SUBIR_GARRA:   { id: 5, codigo: 5, nombre: 'SUBIR_GARRA',   descripcion: 'U: activar salida Q3' },
  BAJAR_GARRA:   { id: 6, codigo: 6, nombre: 'BAJAR_GARRA',   descripcion: 'J: activar salida Q2' },
  BOCINA:        { id: 7, codigo: 7, nombre: 'BOCINA',         descripcion: 'B: activar salida Q1' },
  APAGAR_TODO:   { id: 8, codigo: 8, nombre: 'APAGAR_TODO',   descripcion: 'Q: apagar todas las salidas' },
};

/** Mapa joystick: dirección → comando */
export const JOYSTICK_MAP = {
  up:    COMMANDS.AVANZAR,
  down:  COMMANDS.RETROCEDER,
  left:  COMMANDS.GIRAR_IZQ,
  right: COMMANDS.GIRAR_DER,
};

/** Comando de parada de emergencia */
export const STOP_COMMAND = COMMANDS.APAGAR_TODO;

/** Endpoints reales de la API */
export const ENDPOINTS = {
  status:         () => `${CONFIG.API_BASE_URL}/status`,
  comandos:       (vid) => `${CONFIG.API_BASE_URL}/vehiculos/${vid}/comandos`,
  demos:          (vid) => `${CONFIG.API_BASE_URL}/vehiculos/${vid}/demos`,
  movimiento:     () => `${CONFIG.API_BASE_URL}/movimientos`,
  ejecutarDemo:   () => `${CONFIG.API_BASE_URL}/demos/ejecutar`,
};
