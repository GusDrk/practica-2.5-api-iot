/**
 * date-formatter.js — Utilidades de formateo de fecha y hora
 * Convierte timestamps ISO en Fecha (DD/MM/AAAA) y Hora (HH:MM:SS)
 * en zona horaria local segura.
 */

/**
 * Parsea una fecha/timestamp (ISO o Date) y devuelve fecha y hora formateadas.
 * @param {string|Date} dateInput 
 * @returns {{ fecha: string, hora: string, completa: string }}
 */
export function formatDateTime(dateInput) {
  if (!dateInput) {
    return { fecha: '--/--/----', hora: '--:--:--', completa: 'Sin registro' };
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { fecha: '--/--/----', hora: '--:--:--', completa: String(dateInput) };
    }

    const pad = (n) => String(n).padStart(2, '0');

    const dia  = pad(d.getDate());
    const mes  = pad(d.getMonth() + 1);
    const anio = d.getFullYear();

    const horas = pad(d.getHours());
    const mins  = pad(d.getMinutes());
    const segs  = pad(d.getSeconds());

    const fecha = `${dia}/${mes}/${anio}`;
    const hora  = `${horas}:${mins}:${segs}`;

    return {
      fecha,
      hora,
      completa: `${fecha} ${hora}`,
    };
  } catch {
    return { fecha: '--/--/----', hora: '--:--:--', completa: 'Fecha inválida' };
  }
}
