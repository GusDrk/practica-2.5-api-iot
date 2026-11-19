import { commandService } from '../domain/commands.js';
import { COMMANDS } from '../config.js';

const TASKS_VERSION = '0.10.22';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const GESTURES = {
  forward: { label: 'Índice · Avanzar', command: COMMANDS.AVANZAR },
  backward: { label: 'Dos dedos · Retroceder', command: COMMANDS.RETROCEDER },
  left: { label: 'Pulgar izquierda · Girar', command: COMMANDS.GIRAR_IZQ },
  right: { label: 'Pulgar derecha · Girar', command: COMMANDS.GIRAR_DER },
  clawUp: { label: 'Pulgar arriba · Subir garra', command: COMMANDS.SUBIR_GARRA },
  clawDown: { label: 'Pulgar abajo · Bajar garra', command: COMMANDS.BAJAR_GARRA },
  horn: { label: 'Puño · Bocina', command: COMMANDS.BOCINA },
};

function classify(landmarks) {
  const up = (tip, joint) => landmarks[tip].y < landmarks[joint].y;
  const index = up(8, 6);
  const middle = up(12, 10);
  const ring = up(16, 14);
  const pinky = up(20, 18);

  if (index && middle && ring && pinky) return { stop: true, label: 'Palma abierta · DETENER' };
  if (index && middle && !ring && !pinky) return GESTURES.backward;
  if (index && !middle && !ring && !pinky) return GESTURES.forward;

  const thumbX = landmarks[4].x - landmarks[0].x;
  const thumbY = landmarks[4].y - landmarks[0].y;
  const thumbExtended = Math.max(Math.abs(thumbX), Math.abs(thumbY)) > 0.12;
  if (!index && !middle && !ring && !pinky && thumbExtended) {
    if (Math.abs(thumbX) > Math.abs(thumbY)) return thumbX > 0 ? GESTURES.right : GESTURES.left;
    return thumbY > 0 ? GESTURES.clawDown : GESTURES.clawUp;
  }
  if (!index && !middle && !ring && !pinky) return GESTURES.horn;
  return null;
}

export class HandControl {
  #modal = document.getElementById('hand-control-modal');
  #video = document.getElementById('hand-camera');
  #canvas = document.getElementById('hand-overlay');
  #status = document.getElementById('hand-control-status');
  #startButton = document.getElementById('btn-hand-start');
  #armButton = document.getElementById('btn-hand-arm');
  #armed = false;
  #stream = null;
  #landmarker = null;
  #raf = 0;
  #candidate = null;
  #candidateSince = 0;
  #active = null;
  #lastCommandAt = 0;

  constructor() {
    document.getElementById('btn-movimiento-manos')?.addEventListener('click', () => this.open());
    this.#startButton?.addEventListener('click', () => this.startCamera());
    this.#armButton?.addEventListener('click', () => this.toggleArm());
    document.getElementById('btn-hand-stop')?.addEventListener('click', () => this.stopVehicle());
    document.getElementById('btn-hand-close')?.addEventListener('click', () => this.close());
    this.#modal?.addEventListener('click', event => {
      if (event.target === this.#modal) this.close();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopVehicle();
    });
  }

  open() {
    this.#modal.hidden = false;
    this.#setStatus('Pulsa “Iniciar cámara” y acepta el permiso.');
  }

  async startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara requiere HTTPS y un navegador compatible.');
      }
      this.#startButton.disabled = true;
      this.#setStatus('Solicitando acceso a la cámara…');
      this.#stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.#video.srcObject = this.#stream;
      await this.#video.play();
      const vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/+esm`);
      const files = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      this.#landmarker = await vision.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
      this.#armButton.disabled = false;
      this.#startButton.textContent = 'Cámara activa';
      this.#setStatus('Cámara lista. El control sigue desactivado.');
      this.#loop();
    } catch (error) {
      this.#startButton.disabled = false;
      this.#setStatus(error.message || 'No se pudo iniciar la cámara.', true);
      this.#releaseCamera();
    }
  }

  toggleArm() {
    this.#armed = !this.#armed;
    this.#armButton.textContent = this.#armed ? 'Desactivar control' : 'Activar control';
    this.#candidate = null;
    if (!this.#armed) this.stopVehicle();
    else this.#setStatus('Control activo. Mantén una seña 0.6 s para ejecutarla.');
  }

  #loop = () => {
    if (!this.#landmarker || this.#video.readyState < 2) {
      this.#raf = requestAnimationFrame(this.#loop);
      return;
    }
    const result = this.#landmarker.detectForVideo(this.#video, performance.now());
    const landmarks = result.landmarks?.[0];
    const gesture = landmarks ? classify(landmarks) : null;
    this.#draw(landmarks);
    this.#handleGesture(gesture);
    this.#raf = requestAnimationFrame(this.#loop);
  };

  #handleGesture(gesture) {
    if (!this.#armed) {
      if (gesture) this.#setStatus(`Detectado: ${gesture.label}. Control desactivado.`);
      return;
    }
    if (gesture?.stop) {
      this.#candidate = null;
      if (this.#active) this.stopVehicle();
      else this.#setStatus(gesture.label);
      return;
    }
    if (this.#active && gesture !== this.#active) {
      this.stopVehicle();
      return;
    }
    if (!gesture) {
      this.#candidate = null;
      if (this.#active) this.stopVehicle();
      return;
    }
    if (this.#active === gesture) return;
    if (this.#candidate !== gesture) {
      this.#candidate = gesture;
      this.#candidateSince = performance.now();
      this.#setStatus(`Confirma: ${gesture.label}…`);
      return;
    }
    if (performance.now() - this.#candidateSince < 600 || performance.now() - this.#lastCommandAt < 700) return;
    this.#lastCommandAt = performance.now();
    this.#active = gesture;
    this.#candidate = null;
    commandService.send(gesture.command)
      .then(() => this.#setStatus(`Ejecutando: ${gesture.label}`))
      .catch(error => {
        this.#active = null;
        this.#setStatus(`Error enviando comando: ${error.message}`, true);
      });
  }

  async stopVehicle() {
    this.#candidate = null;
    if (!this.#active) return;
    this.#active = null;
    try {
      await commandService.stop();
      this.#setStatus('Detenido.');
    } catch (error) {
      this.#setStatus(`No se pudo detener: ${error.message}`, true);
    }
  }

  async close() {
    await this.stopVehicle();
    this.#armed = false;
    this.#modal.hidden = true;
    this.#releaseCamera();
  }

  #releaseCamera() {
    cancelAnimationFrame(this.#raf);
    this.#landmarker?.close();
    this.#landmarker = null;
    this.#stream?.getTracks().forEach(track => track.stop());
    this.#stream = null;
    if (this.#video) this.#video.srcObject = null;
    if (this.#armButton) {
      this.#armButton.disabled = true;
      this.#armButton.textContent = 'Activar control';
    }
    if (this.#startButton) {
      this.#startButton.disabled = false;
      this.#startButton.textContent = 'Iniciar cámara';
    }
  }

  #draw(landmarks) {
    const canvas = this.#canvas;
    const video = this.#video;
    if (!canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    ctx.fillStyle = '#22c55e';
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #setStatus(message, error = false) {
    if (!this.#status) return;
    this.#status.textContent = message;
    this.#status.classList.toggle('is-error', error);
  }
}
