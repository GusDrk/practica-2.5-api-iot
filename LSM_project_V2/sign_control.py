"""Control del carrito con una seña: índice levantado = AVANZAR.

El programa usa MediaPipe para detectar la mano y llama a la API existente:
POST /movimientos con el vehículo y comando configurados. No entrena ni guarda
imágenes o videos.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import cv2
import mediapipe as mp


@dataclass(frozen=True)
class ControlConfig:
    api_url: str
    vehicle_id: int
    forward_command_id: int
    stop_command_id: int
    camera_index: int
    activate_delay: float = 0.6


@dataclass(frozen=True)
class GestureCommand:
    label: str
    command_id: int | None


STOP = GestureCommand("PALMA ABIERTA: DETENER", None)
GESTURES = {
    "AVANZAR": GestureCommand("INDICE: AVANZAR", 1),
    "RETROCEDER": GestureCommand("DOS DEDOS: RETROCEDER", 2),
    "GIRAR_IZQUIERDA": GestureCommand("PULGAR IZQUIERDA: GIRAR", 3),
    "GIRAR_DERECHA": GestureCommand("PULGAR DERECHA: GIRAR", 4),
    "SUBIR_GARRA": GestureCommand("PULGAR ARRIBA: SUBIR GARRA", 5),
    "BAJAR_GARRA": GestureCommand("PULGAR ABAJO: BAJAR GARRA", 6),
    "BOCINA": GestureCommand("PUNO: BOCINA", 7),
}


def classify_gesture(hand_landmarks) -> GestureCommand | None:
    """Clasifica posturas estáticas con la palma aproximadamente frente a cámara."""
    points = hand_landmarks.landmark
    index_up = points[8].y < points[6].y
    middle_up = points[12].y < points[10].y
    ring_up = points[16].y < points[14].y
    pinky_up = points[20].y < points[18].y
    folded = not index_up and not middle_up and not ring_up and not pinky_up

    # Palma abierta: prioridad máxima; siempre detiene el carrito.
    if index_up and middle_up and ring_up and pinky_up:
        return STOP
    if index_up and middle_up and not ring_up and not pinky_up:
        return GESTURES["RETROCEDER"]
    if index_up and not middle_up and not ring_up and not pinky_up:
        return GESTURES["AVANZAR"]

    # Con los cuatro dedos doblados, la dirección del pulgar indica giro o garra.
    thumb_x = points[4].x - points[0].x
    thumb_y = points[4].y - points[0].y
    thumb_extended = max(abs(thumb_x), abs(thumb_y)) > 0.12
    if folded and thumb_extended:
        if abs(thumb_x) > abs(thumb_y):
            return GESTURES["GIRAR_DERECHA" if thumb_x > 0 else "GIRAR_IZQUIERDA"]
        return GESTURES["BAJAR_GARRA" if thumb_y > 0 else "SUBIR_GARRA"]
    if folded:
        return GESTURES["BOCINA"]
    return None


def send_command(config: ControlConfig, command_id: int) -> tuple[bool, str]:
    """Envía un único comando al endpoint ya usado por la aplicación web."""
    body = json.dumps(
        {"id_vehiculo": config.vehicle_id, "id_comando": command_id}
    ).encode("utf-8")
    request = Request(
        f"{config.api_url.rstrip('/')}/movimientos",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            if 200 <= response.status < 300:
                return True, "Comando enviado"
            return False, f"La API respondió HTTP {response.status}"
    except (URLError, TimeoutError, OSError) as error:
        return False, f"No se pudo conectar a la API: {error}"


def put_text(frame, text: str, line: int, color: tuple[int, int, int]) -> None:
    cv2.putText(
        frame, text, (20, 35 + line * 32), cv2.FONT_HERSHEY_SIMPLEX,
        0.75, color, 2, cv2.LINE_AA,
    )


def draw_hand(frame, landmarks) -> None:
    """Dibuja los 21 puntos y conexiones de la mano detectada."""
    height, width = frame.shape[:2]
    for connection in mp.tasks.vision.HandLandmarksConnections.HAND_CONNECTIONS:
        start = landmarks[connection.start]
        end = landmarks[connection.end]
        cv2.line(
            frame, (int(start.x * width), int(start.y * height)),
            (int(end.x * width), int(end.y * height)), (0, 255, 0), 2,
        )
    for landmark in landmarks:
        cv2.circle(frame, (int(landmark.x * width), int(landmark.y * height)), 4, (0, 0, 255), -1)


def run(config: ControlConfig) -> None:
    model_path = Path(__file__).with_name("hand_landmarker.task")
    if not model_path.exists():
        raise RuntimeError(
            "Falta hand_landmarker.task. Ejecuta download_model.ps1 desde esta carpeta."
        )

    options = mp.tasks.vision.HandLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.7,
        min_tracking_confidence=0.7,
    )
    cap = cv2.VideoCapture(config.camera_index)
    if not cap.isOpened():
        raise RuntimeError(
            f"No se pudo abrir la cámara {config.camera_index}. "
            "Prueba con --camera 1."
        )

    armed = False
    active_gesture: GestureCommand | None = None
    candidate: GestureCommand | None = None
    candidate_started_at: float | None = None
    status = "DESARMADO: presiona A para activar"
    status_color = (0, 165, 255)

    try:
        with mp.tasks.vision.HandLandmarker.create_from_options(options) as landmarker:
            while True:
                ok, frame = cap.read()
                if not ok:
                    status = "No se pudo leer la cámara"
                    status_color = (0, 0, 255)
                    break

                frame = cv2.flip(frame, 1)
                now = time.monotonic()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect_for_video(image, int(now * 1000))
                gesture = None
                if result.hand_landmarks:
                    hand = result.hand_landmarks[0]
                    draw_hand(frame, hand)
                    gesture = classify_gesture(hand)

                # Una palma abierta se atiende sin espera. Cualquier cambio o
                # pérdida de seña detiene primero y exige confirmar la nueva.
                if armed and gesture == STOP:
                    if active_gesture is not None:
                        success, status = send_command(config, config.stop_command_id)
                        status_color = (0, 255, 0) if success else (0, 0, 255)
                    active_gesture = None
                    candidate = None
                    candidate_started_at = None
                elif active_gesture is not None and gesture != active_gesture:
                    success, status = send_command(config, config.stop_command_id)
                    active_gesture = None
                    candidate = None
                    candidate_started_at = None
                    status_color = (0, 255, 0) if success else (0, 0, 255)
                elif armed and active_gesture is None and gesture is not None:
                    if gesture != candidate:
                        candidate = gesture
                        candidate_started_at = now
                    elif now - candidate_started_at >= config.activate_delay:
                        success, status = send_command(config, gesture.command_id)
                        if success:
                            active_gesture = gesture
                        status_color = (0, 255, 0) if success else (0, 0, 255)
                else:
                    candidate = None
                    candidate_started_at = None

                gesture_text = gesture.label if gesture else "Sin seña reconocida"
                put_text(frame, gesture_text, 0, (0, 255, 0) if gesture else (230, 230, 230))
                put_text(frame, "ACTIVO" if armed else "DESARMADO (A para activar)", 1,
                         (0, 255, 0) if armed else (0, 165, 255))
                active_text = active_gesture.label if active_gesture else "DETENIDO"
                put_text(frame, active_text, 2,
                         (0, 255, 0) if active_gesture else (0, 0, 255))
                put_text(frame, status, 3, status_color)
                put_text(frame, "A: activar/desactivar | Q o ESC: salir", 4, (230, 230, 230))
                cv2.imshow("Control por senas - indice = avanzar", frame)

                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break
                if key in (ord("a"), ord("A")):
                    armed = not armed
                    if not armed and active_gesture is not None:
                        _, status = send_command(config, config.stop_command_id)
                        active_gesture = None
                    status = "Control activado" if armed else "Control desactivado"
                    status_color = (0, 255, 0) if armed else (0, 165, 255)
    finally:
        if active_gesture is not None:
            send_command(config, config.stop_command_id)
        cap.release()
        cv2.destroyAllWindows()


def parse_args() -> ControlConfig:
    parser = argparse.ArgumentParser(description="Índice levantado = avanzar carrito")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--vehicle-id", type=int, default=1)
    parser.add_argument("--forward-command-id", type=int, default=1)
    parser.add_argument("--stop-command-id", type=int, default=8)
    parser.add_argument("--camera", type=int, default=0)
    args = parser.parse_args()
    return ControlConfig(
        api_url=args.api_url,
        vehicle_id=args.vehicle_id,
        forward_command_id=args.forward_command_id,
        stop_command_id=args.stop_command_id,
        camera_index=args.camera,
    )


if __name__ == "__main__":
    try:
        run(parse_args())
    except RuntimeError as error:
        raise SystemExit(f"Error: {error}")
