/**
 * voice-control.js — Control por voz con Web Speech API.
 * Reconoce instrucciones en español y las ejecuta en secuencia usando los
 * mismos comandos que el joystick y los botones existentes.
 */

import { COMMANDS } from '../config.js';
import { commandService } from '../domain/commands.js';
import { messageService } from './messages.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const COMMAND_PATTERNS = [
  { command: COMMANDS.AVANZAR, patterns: [/\b(avanza(?:r)?|avante|adelante|hacia adelante)\b/] },
  { command: COMMANDS.RETROCEDER, patterns: [/\b(retrocede(?:r)?|atras|atrás|hacia atras|hacia atrás)\b/] },
  { command: COMMANDS.GIRAR_IZQ, patterns: [/\b(gira(?:r)?(?: hacia)?|ve(?: hacia)?)?\s*(?:a la )?izquierda\b/] },
  { command: COMMANDS.GIRAR_DER, patterns: [/\b(gira(?:r)?(?: hacia)?|ve(?: hacia)?)?\s*(?:a la )?derecha\b/] },
  { command: COMMANDS.SUBIR_GARRA, patterns: [/\b(sube|subir|levanta|levantar)\s+(?:la )?garra\b/] },
  { command: COMMANDS.BAJAR_GARRA, patterns: [/\b(baja|bajar|desciende|descender)\s+(?:la )?garra\b/] },
  { command: COMMANDS.BOCINA, patterns: [/\b(bocina|toca(?:r)?(?: la)? bocina|claxon)\b/] },
];

const NUMBER_WORDS = {
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

/** Convierte una frase como "avanza 5 segundos" en pasos ejecutables. */
export function parseVoiceInstruction(transcript) {
  const normalized = transcript
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[,.;]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  if (/\b(detener|detente|para|parar|alto)\b/.test(normalized)) return { stop: true, steps: [] };

  const segments = normalized.split(/\b(?:y despues|despues|luego|y|posteriormente)\b/);
  const steps = [];
  for (const segment of segments) {
    const match = COMMAND_PATTERNS.find(({ patterns }) => patterns.some(pattern => pattern.test(segment)));
    if (!match) continue;
    const durationMatch = segment.match(/\b(\d+(?:[.,]\d+)?|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(?:segundo|segundos|seg)\b/);
    const value = durationMatch ? durationMatch[1].replace(',', '.') : null;
    const seconds = value && (NUMBER_WORDS[value] ?? Number(value));
    // Para bocina, una pulsación corta es útil si no se indica duración.
    const durationMs = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 60) * 1000 : match.command === COMMANDS.BOCINA ? 800 : null;
    if (durationMs) steps.push({ command: match.command, durationMs });
  }
  return { stop: false, steps };
}

export class VoiceControl {
  #modal = document.getElementById('voice-control-modal');
  #openButton = document.getElementById('btn-control-voz');
  #finishButton = document.getElementById('btn-voice-finish');
  #retryButton = document.getElementById('btn-voice-retry');
  #status = document.getElementById('voice-status');
  #transcript = document.getElementById('voice-transcript');
  #recognition = null;
  #active = false;
  #sequenceId = 0;

  constructor() {
    if (!this.#modal || !this.#openButton) return;
    this.#openButton.addEventListener('click', () => this.open());
    this.#finishButton?.addEventListener('click', () => this.finish());
    this.#retryButton?.addEventListener('click', () => this.#startListening());
  }

  open() {
    this.#modal.hidden = false;
    this.#active = true;
    this.#openButton.setAttribute('aria-expanded', 'true');
    if (!SpeechRecognition) {
      this.#setStatus('El navegador no admite reconocimiento de voz. Usa Chrome o Edge.', true);
      this.#retryButton.disabled = true;
      return;
    }
    this.#startListening();
  }

  finish() {
    this.#active = false;
    this.#sequenceId += 1;
    this.#recognition?.abort();
    commandService.stop().catch(() => {});
    this.#modal.hidden = true;
    this.#openButton.setAttribute('aria-expanded', 'false');
    this.#openButton.focus();
  }

  #startListening() {
    if (!this.#active || !SpeechRecognition) return;
    this.#recognition?.abort();
    const recognition = new SpeechRecognition();
    this.#recognition = recognition;
    recognition.lang = 'es-MX';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => this.#setStatus('Escuchando… di tu instrucción.');
    recognition.onresult = event => this.#handleTranscript(event.results[0][0].transcript);
    recognition.onerror = event => {
      if (!this.#active || event.error === 'aborted') return;
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      this.#setStatus(denied ? 'Permite el acceso al micrófono para continuar.' : 'No se entendió la instrucción. Inténtalo de nuevo.', denied);
    };
    recognition.onend = () => {
      if (this.#active && this.#status.textContent === 'Escuchando… di tu instrucción.') {
        this.#setStatus('Pulsa “Escuchar de nuevo” para dar otra instrucción.');
      }
    };
    try {
      recognition.start();
    } catch {
      this.#setStatus('El micrófono se está preparando. Inténtalo de nuevo.');
    }
  }

  #handleTranscript(transcript) {
    this.#transcript.textContent = `“${transcript}”`;
    const parsed = parseVoiceInstruction(transcript);
    if (parsed.stop) {
      this.#sequenceId += 1;
      commandService.stop().catch(() => {});
      this.#setStatus('Secuencia detenida. Puedes dar otra instrucción o terminar.');
      return;
    }
    if (!parsed.steps.length) {
      this.#setStatus('No encontré una acción con duración. Inténtalo de nuevo.');
      return;
    }
    this.#runSequence(parsed.steps);
  }

  async #runSequence(steps) {
    const runId = ++this.#sequenceId;
    this.#setStatus(`Ejecutando ${steps.length} ${steps.length === 1 ? 'acción' : 'acciones'}…`);
    try {
      for (const { command, durationMs } of steps) {
        if (!this.#active || runId !== this.#sequenceId) return;
        this.#setStatus(`${command.nombre.replaceAll('_', ' ')} durante ${durationMs / 1000} s…`);
        await commandService.send(command);
        await wait(durationMs);
        if (!this.#active || runId !== this.#sequenceId) return;
        await commandService.stop();
      }
      if (this.#active && runId === this.#sequenceId) {
        this.#setStatus('Secuencia terminada. Puedes dar otra instrucción o pulsar Terminar.');
      }
    } catch {
      if (this.#active && runId === this.#sequenceId) {
        this.#setStatus('No se pudo enviar una acción. Revisa la conexión e inténtalo de nuevo.', true);
        messageService.error('No se pudo ejecutar la instrucción de voz.');
      }
      commandService.stop().catch(() => {});
    }
  }

  #setStatus(text, isError = false) {
    if (!this.#status) return;
    this.#status.textContent = text;
    this.#status.classList.toggle('is-error', isError);
  }
}
