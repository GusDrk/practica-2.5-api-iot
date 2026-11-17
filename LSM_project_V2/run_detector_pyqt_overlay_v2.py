import sys
import cv2
import mediapipe as mp
import numpy as np
import pickle
import time
import threading
import requests
from pathlib import Path
from collections import deque, Counter

from PyQt5.QtWidgets import QApplication, QLabel, QWidget, QVBoxLayout
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont

from lsm_features_v2 import (
    get_primary_hand,
    extract_normalized_landmarks,
    prepare_sequence_for_model
)

# =============================
# Variables globales del overlay
# =============================

detected_letter = "..."
confidence = 0
current_word = ""
status_message = ""

# =============================
# Discord Webhook
# =============================

# Pega aquí tu webhook localmente.
# Recomendación: regenera el webhook si ya lo compartiste.
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1505322453222555708/DxxijB2BnPmspYK7DRurNjPvu13VfrIDXnXEV_hq8yachvE9hOLyOlYjWgt9Ao3Y18uQ"


def send_to_discord(message):
    global status_message

    message = message.strip()

    if not message:
        status_message = "No hay texto para enviar"
        return

    if DISCORD_WEBHOOK_URL == "PEGA_AQUI_TU_WEBHOOK":
        status_message = "Webhook no configurado"
        print("Configura DISCORD_WEBHOOK_URL")
        return

    data = {
        "content": f"LSM: {message}"
    }

    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=data)

        if response.status_code in [200, 204]:
            status_message = "Enviado a Discord"
            print("Mensaje enviado a Discord:", message)
        else:
            status_message = "Error al enviar"
            print("Error Discord:", response.status_code, response.text)

    except Exception as e:
        status_message = "Error de conexion"
        print("Error de conexión:", e)


# =============================
# Clase Overlay PyQt5
# =============================

class LSMOverlay(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("LSM Overlay V2")

        self.setWindowFlags(
            Qt.FramelessWindowHint |
            Qt.WindowStaysOnTopHint |
            Qt.Tool
        )

        self.setAttribute(Qt.WA_TranslucentBackground)

        self.setGeometry(100, 100, 660, 250)

        self.container = QWidget(self)
        self.container.setGeometry(0, 0, 660, 250)

        self.container.setStyleSheet("""
            QWidget {
                background-color: rgba(20, 20, 20, 225);
                border: 2px solid #00ffff;
                border-radius: 18px;
            }
        """)

        layout = QVBoxLayout()
        layout.setContentsMargins(25, 18, 25, 18)
        layout.setSpacing(8)

        self.title_label = QLabel("LSM Detector V2")
        self.title_label.setFont(QFont("Arial", 16, QFont.Bold))
        self.title_label.setStyleSheet("color: white; border: none;")

        self.letter_label = QLabel("Detectando: ...")
        self.letter_label.setFont(QFont("Arial", 28, QFont.Bold))
        self.letter_label.setStyleSheet("color: #ff3333; border: none;")

        self.word_label = QLabel("Palabra:")
        self.word_label.setFont(QFont("Arial", 17))
        self.word_label.setStyleSheet("color: white; border: none;")

        self.status_label = QLabel("")
        self.status_label.setFont(QFont("Arial", 12, QFont.Bold))
        self.status_label.setStyleSheet("color: #00ffff; border: none;")

        self.help_label = QLabel(
            "ENTER: enviar | C: limpiar | SPACE: espacio | BACKSPACE: borrar | ESC: salir"
        )
        self.help_label.setFont(QFont("Arial", 10))
        self.help_label.setStyleSheet("color: #bbbbbb; border: none;")

        layout.addWidget(self.title_label)
        layout.addWidget(self.letter_label)
        layout.addWidget(self.word_label)
        layout.addWidget(self.status_label)
        layout.addWidget(self.help_label)

        self.container.setLayout(layout)

        self.last_status = ""
        self.status_start_time = 0

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_overlay)
        self.timer.start(100)

    def update_overlay(self):
        global detected_letter, confidence, current_word, status_message

        self.letter_label.setText(
            f"Detectando: {detected_letter} ({confidence:.0f}%)"
        )

        self.word_label.setText(
            f"Palabra: {current_word}"
        )

        if confidence >= 80:
            color = "#00ff66"
        elif confidence >= 60:
            color = "#ffff00"
        else:
            color = "#ff3333"

        self.letter_label.setStyleSheet(
            f"color: {color}; border: none;"
        )

        if status_message != self.last_status:
            self.last_status = status_message
            self.status_start_time = time.time()

        if status_message:
            elapsed = time.time() - self.status_start_time

            if elapsed <= 2.5:
                self.status_label.setText(status_message)
            else:
                self.status_label.setText("")
                status_message = ""
                self.last_status = ""

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drag_position = event.globalPos() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton:
            self.move(event.globalPos() - self.drag_position)
            event.accept()

    def keyPressEvent(self, event):
        global current_word, detected_letter, confidence, status_message

        if event.key() == Qt.Key_Escape:
            QApplication.quit()

        elif event.key() == Qt.Key_C:
            current_word = ""
            detected_letter = "..."
            confidence = 0
            status_message = "Texto limpiado"

        elif event.key() == Qt.Key_Backspace:
            current_word = current_word[:-1]
            status_message = "Ultima letra borrada"

        elif event.key() == Qt.Key_Space:
            if len(current_word) > 0 and current_word[-1] != " ":
                current_word += " "
                status_message = "Espacio agregado"

        elif event.key() == Qt.Key_Return or event.key() == Qt.Key_Enter:
            send_to_discord(current_word)

            if current_word.strip():
                current_word = ""
                detected_letter = "..."
                confidence = 0


# =============================
# Detector V2
# =============================

def run_lsm_detector_v2():
    global detected_letter, confidence, current_word, status_message

    # =============================
    # Cargar modelo V2
    # =============================

    BASE_DIR = Path(__file__).resolve().parent
    MODEL_PATH = BASE_DIR / "model_v2" / "lsm_model_v2.p"

    if not MODEL_PATH.exists():
        print("No se encontró el modelo V2:")
        print(MODEL_PATH)
        status_message = "Modelo V2 no encontrado"
        return

    with open(MODEL_PATH, "rb") as f:
        model_dict = pickle.load(f)

    model = model_dict["model"]

    SEQUENCE_LENGTH = model_dict.get("sequence_length", 30)

    print("Modelo V2 cargado correctamente")
    print("Sequence length:", SEQUENCE_LENGTH)
    print("Features:", model_dict.get("features", "N/A"))
    print("Labels:", model_dict.get("labels", []))

    # =============================
    # MediaPipe
    # =============================

    mp_hands = mp.solutions.hands

    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7
    )

    # =============================
    # Configuración
    # =============================

    sequence = deque(maxlen=SEQUENCE_LENGTH)
    prediction_history = deque(maxlen=10)

    last_letter = ""
    letter_start_time = 0
    LETTER_DELAY = 1.2

    last_detection_time = time.time()
    AUTO_SPACE_DELAY = 3.0
    space_added = False

    # Cambia a 1 o 2 si Iriun/celular usa otro índice
    CAMERA_INDEX = 0
    cap = cv2.VideoCapture(CAMERA_INDEX)

    if not cap.isOpened():
        print("No se pudo abrir la cámara.")
        status_message = "Camara no disponible"
        return

    print("Detector V2 iniciado")

    while True:

        ret, frame = cap.read()

        if not ret:
            print("No se pudo leer la cámara")
            status_message = "Error de camara"
            break

        frame = cv2.flip(frame, 1)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        hand_detected = False

        if results.multi_hand_landmarks:

            hand_landmarks = get_primary_hand(results.multi_hand_landmarks)

            if hand_landmarks:

                hand_detected = True
                last_detection_time = time.time()
                space_added = False

                frame_data = extract_normalized_landmarks(hand_landmarks)

                sequence.append(frame_data)

                if len(sequence) == SEQUENCE_LENGTH:

                    input_data = prepare_sequence_for_model(sequence)
                    input_data = np.array(input_data).reshape(1, -1)

                    prediction = model.predict(input_data)[0]

                    probabilities = model.predict_proba(input_data)[0]
                    confidence = np.max(probabilities) * 100

                    prediction_history.append(prediction)

                    stable_letter = Counter(
                        prediction_history
                    ).most_common(1)[0][0]

                    detected_letter = stable_letter

                    current_time = time.time()

                    if stable_letter != last_letter:
                        last_letter = stable_letter
                        letter_start_time = current_time

                    else:
                        elapsed = current_time - letter_start_time

                        if elapsed > LETTER_DELAY:

                            if (
                                len(current_word) == 0
                                or current_word[-1] != stable_letter
                            ):
                                current_word += stable_letter

                            letter_start_time = current_time

        # =============================
        # Si no hay mano: espacio automático
        # =============================

        if not hand_detected:

            elapsed_no_hand = time.time() - last_detection_time

            if elapsed_no_hand > 0.5:
                detected_letter = "..."
                confidence = 0
                prediction_history.clear()
                sequence.clear()

            if (
                elapsed_no_hand > AUTO_SPACE_DELAY
                and not space_added
                and len(current_word) > 0
                and current_word[-1] != " "
            ):
                current_word += " "
                space_added = True
                status_message = "Espacio automatico"

        # Pequeña pausa para no saturar CPU
        time.sleep(0.005)

    cap.release()
    hands.close()
    cv2.destroyAllWindows()


# =============================
# Main
# =============================

if __name__ == "__main__":

    detector_thread = threading.Thread(
        target=run_lsm_detector_v2,
        daemon=True
    )

    detector_thread.start()

    app = QApplication(sys.argv)

    overlay = LSMOverlay()
    overlay.show()

    sys.exit(app.exec_())