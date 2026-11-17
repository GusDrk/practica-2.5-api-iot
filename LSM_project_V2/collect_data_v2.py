import cv2
import mediapipe as mp
import pickle
import time
from pathlib import Path

from lsm_features_v2 import get_primary_hand, extract_normalized_landmarks

# =============================
# Configuración general
# =============================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data_v2"

print("Carpeta base:", BASE_DIR)
print("Carpeta de datos:", DATA_DIR)

DATA_DIR.mkdir(parents=True, exist_ok=True)

SEQUENCE_LENGTH = 30

# Cambia a 1 si Iriun/celular está en otra cámara
CAMERA_INDEX = 0

# =============================
# Entrada del usuario
# =============================

label = input("Letra a grabar: ").upper().strip()

if not label:
    print("No ingresaste ninguna letra.")
    exit()

print("\nTipo de variación:")
print("1. normal")
print("2. arriba")
print("3. abajo")
print("4. cerca")
print("5. lejos")
print("6. giro")
print("7. otra_luz")
print("8. otro_fondo")
print("9. movimiento")

option = input("Selecciona variación: ").strip()

variants = {
    "1": "normal",
    "2": "arriba",
    "3": "abajo",
    "4": "cerca",
    "5": "lejos",
    "6": "giro",
    "7": "otra_luz",
    "8": "otro_fondo",
    "9": "movimiento"
}

variant = variants.get(option, "normal")

try:
    num_sequences = int(input("Cantidad de secuencias a grabar: "))
except ValueError:
    print("Debes ingresar un número válido.")
    exit()

if num_sequences <= 0:
    print("La cantidad de secuencias debe ser mayor a 0.")
    exit()

print("\n====================================")
print(f"Letra: {label}")
print(f"Variación: {variant}")
print(f"Secuencias: {num_sequences}")
print("Presiona SPACE para empezar cada captura")
print("Presiona ESC para salir")
print("====================================\n")

# =============================
# MediaPipe
# =============================

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

# =============================
# Cámara
# =============================

cap = cv2.VideoCapture(CAMERA_INDEX)

if not cap.isOpened():
    print("No se pudo abrir la cámara.")
    print("Prueba cambiando CAMERA_INDEX a 1 o 2.")
    exit()

data = []
labels = []

recording = False
sequence = []
captured_sequences = 0

# =============================
# Loop de captura
# =============================

while True:

    ret, frame = cap.read()

    if not ret:
        print("No se pudo leer la cámara")
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)

    display_text = f"{label} | {variant} | {captured_sequences}/{num_sequences}"

    cv2.putText(
        frame,
        display_text,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 255),
        2
    )

    cv2.putText(
        frame,
        "SPACE: capturar | ESC: salir",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    if recording:
        cv2.putText(
            frame,
            f"Grabando frame {len(sequence)}/{SEQUENCE_LENGTH}",
            (20, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

    if results.multi_hand_landmarks:

        hand_landmarks = get_primary_hand(results.multi_hand_landmarks)

        if hand_landmarks:

            mp_draw.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS
            )

            if recording:

                frame_data = extract_normalized_landmarks(hand_landmarks)
                sequence.append(frame_data)

                if len(sequence) == SEQUENCE_LENGTH:

                    data.append(sequence)
                    labels.append(label)

                    captured_sequences += 1
                    sequence = []
                    recording = False

                    print(f"Secuencia guardada: {captured_sequences}/{num_sequences}")

                    if captured_sequences >= num_sequences:
                        break

    else:
        if recording:
            cv2.putText(
                frame,
                "No se detecta mano",
                (20, 160),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )

    cv2.imshow("Collect Data V2", frame)

    key = cv2.waitKey(1) & 0xFF

    # ESC
    if key == 27:
        print("Captura cancelada por el usuario.")
        break

    # SPACE
    if key == 32 and not recording:
        sequence = []
        recording = True
        print("Grabando nueva secuencia...")

# =============================
# Liberar recursos
# =============================

cap.release()
cv2.destroyAllWindows()
hands.close()

# =============================
# Guardar sin sobrescribir
# =============================

if len(data) == 0:
    print("\nNo se guardó ningún archivo porque no se capturaron secuencias.")
    exit()

# Reconfirmar carpeta justo antes de guardar
DATA_DIR.mkdir(parents=True, exist_ok=True)

timestamp = int(time.time())

file_name = f"{label}_{variant}_{timestamp}.p"
file_path = DATA_DIR / file_name

print("\nIntentando guardar en:")
print(file_path)
print("Existe carpeta data_v2:", DATA_DIR.exists())

with open(file_path, "wb") as f:
    pickle.dump(
        {
            "data": data,
            "labels": labels,
            "label": label,
            "variant": variant,
            "sequence_length": SEQUENCE_LENGTH,
            "camera_index": CAMERA_INDEX,
            "timestamp": timestamp
        },
        f
    )

print("\nArchivo guardado correctamente:")
print(file_path)
print(f"Total de secuencias guardadas: {len(data)}")