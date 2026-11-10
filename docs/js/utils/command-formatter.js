/**
 * command-formatter.js — Formateo de nombres amigables e iconos de movimientos
 * Mapea códigos y nombres crudos de base de datos a nombres legibles en español:
 * APAGAR_TODO / DETENER -> "Detener"
 * GIRAR_IZQUIERDA / GIRAR_IZQ -> "Girar a la izquierda"
 * GIRAR_DERECHA / GIRAR_DER -> "Girar a la derecha"
 * AVANZAR -> "Avanzar"
 * RETROCEDER -> "Retroceder"
 * SUBIR_GARRA -> "Subir garra"
 * BAJAR_GARRA -> "Bajar garra"
 * BOCINA -> "Bocina"
 */

export const FRIENDLY_COMMAND_NAMES = {
  'APAGAR_TODO':      'Detener',
  'DETENER':          'Detener',
  'GIRAR_IZQUIERDA':  'Girar a la izquierda',
  'GIRAR_IZQ':        'Girar a la izquierda',
  'GIRAR_DERECHA':    'Girar a la derecha',
  'GIRAR_DER':        'Girar a la derecha',
  'AVANZAR':          'Avanzar',
  'RETROCEDER':       'Retroceder',
  'SUBIR_GARRA':      'Subir garra',
  'BAJAR_GARRA':      'Bajar garra',
  'BOCINA':           'Bocina',
};

export const CODE_COMMAND_NAMES = {
  1: 'Avanzar',
  2: 'Retroceder',
  3: 'Girar a la izquierda',
  4: 'Girar a la derecha',
  5: 'Subir garra',
  6: 'Bajar garra',
  7: 'Bocina',
  8: 'Detener',
};

export const COMMAND_ICONS = {
  'APAGAR_TODO':      '🛑',
  'DETENER':          '🛑',
  'AVANZAR':          '⬆️',
  'RETROCEDER':       '⬇️',
  'GIRAR_IZQUIERDA':  '⬅️',
  'GIRAR_IZQ':        '⬅️',
  'GIRAR_DERECHA':    '➡️',
  'GIRAR_DER':        '➡️',
  'SUBIR_GARRA':      '🦾',
  'BAJAR_GARRA':      '👇',
  'BOCINA':           '📢',
};

/**
 * Devuelve el nombre legible y amigable de un comando.
 * @param {string} rawName 
 * @param {number|string|null} code 
 * @returns {string}
 */
export function formatCommandName(rawName, code = null) {
  if (code && CODE_COMMAND_NAMES[Number(code)]) {
    return CODE_COMMAND_NAMES[Number(code)];
  }
  if (!rawName) return 'Sin datos';
  const key = String(rawName).trim().toUpperCase();
  if (FRIENDLY_COMMAND_NAMES[key]) {
    return FRIENDLY_COMMAND_NAMES[key];
  }
  return rawName.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Devuelve el icono representativo del comando.
 * @param {string} rawName 
 * @param {number|string|null} code 
 * @returns {string}
 */
export function getCommandIcon(rawName, code = null) {
  const numCode = Number(code);
  if (numCode === 8) return '🛑';
  if (numCode === 1) return '⬆️';
  if (numCode === 2) return '⬇️';
  if (numCode === 3) return '⬅️';
  if (numCode === 4) return '➡️';
  if (numCode === 5) return '🦾';
  if (numCode === 6) return '👇';
  if (numCode === 7) return '📢';

  if (!rawName) return '🕹️';
  const key = String(rawName).trim().toUpperCase();
  return COMMAND_ICONS[key] || '🕹️';
}
