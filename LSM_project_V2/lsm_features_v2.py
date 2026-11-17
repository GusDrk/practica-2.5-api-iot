import numpy as np


def get_primary_hand(multi_hand_landmarks):
    """
    Selecciona la mano más visible/grande en pantalla.
    Esto evita problemas cuando MediaPipe cambia el orden de las manos.
    """

    if not multi_hand_landmarks:
        return None

    best_hand = None
    best_area = 0

    for hand_landmarks in multi_hand_landmarks:
        xs = [lm.x for lm in hand_landmarks.landmark]
        ys = [lm.y for lm in hand_landmarks.landmark]

        width = max(xs) - min(xs)
        height = max(ys) - min(ys)
        area = width * height

        if area > best_area:
            best_area = area
            best_hand = hand_landmarks

    return best_hand


def extract_normalized_landmarks(hand_landmarks):
    """
    Convierte los landmarks de MediaPipe en coordenadas normalizadas.

    Antes:
        lm.x, lm.y absolutos

    Ahora:
        coordenadas relativas a la muñeca
        divididas entre el tamaño de la mano

    Esto hace que el modelo sea más robusto ante:
        - mano más arriba
        - mano más abajo
        - mano más cerca
        - mano más lejos
        - otra cámara
        - diferente resolución
    """

    landmarks = hand_landmarks.landmark

    wrist = landmarks[0]

    wrist_x = wrist.x
    wrist_y = wrist.y
    wrist_z = wrist.z

    # Calcular tamaño de referencia de la mano
    distances = []

    for lm in landmarks:
        distance = np.sqrt(
            (lm.x - wrist_x) ** 2 +
            (lm.y - wrist_y) ** 2 +
            (lm.z - wrist_z) ** 2
        )
        distances.append(distance)

    scale = max(distances)

    if scale == 0:
        scale = 1

    data = []

    for lm in landmarks:
        x = (lm.x - wrist_x) / scale
        y = (lm.y - wrist_y) / scale
        z = (lm.z - wrist_z) / scale

        data.extend([x, y, z])

    return data


def add_motion_features(sequence):
    """
    Agrega información de movimiento.

    Para cada frame se guarda:
        - posición normalizada
        - cambio respecto al frame anterior

    Esto ayuda para letras con movimiento como J, Z u otras señas dinámicas.
    """

    sequence = np.array(sequence)

    motion_sequence = []

    previous_frame = None

    for frame in sequence:

        if previous_frame is None:
            delta = np.zeros_like(frame)
        else:
            delta = frame - previous_frame

        combined = np.concatenate([frame, delta])
        motion_sequence.append(combined)

        previous_frame = frame

    return np.array(motion_sequence)


def prepare_sequence_for_model(sequence):
    """
    Prepara una secuencia completa para entrenar o predecir.
    """

    motion_sequence = add_motion_features(sequence)

    return motion_sequence.flatten()