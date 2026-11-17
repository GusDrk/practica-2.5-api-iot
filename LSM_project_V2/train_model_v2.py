import os
import pickle
import numpy as np
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from lsm_features_v2 import prepare_sequence_for_model

# =============================
# Rutas
# =============================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data_v2"
MODEL_DIR = BASE_DIR / "model_v2"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "lsm_model_v2.p"

# =============================
# Cargar datos
# =============================

data = []
labels = []

print("Leyendo datos desde:")
print(DATA_DIR)

if not DATA_DIR.exists():
    print("No existe la carpeta data_v2.")
    exit()

files = list(DATA_DIR.glob("*.p"))

if len(files) == 0:
    print("No hay archivos .p en data_v2.")
    print("Primero ejecuta collect_data_v2.py y graba algunas secuencias.")
    exit()

for file_path in files:

    print("Cargando:", file_path.name)

    with open(file_path, "rb") as f:
        dict_data = pickle.load(f)

    file_data = dict_data.get("data", [])
    file_labels = dict_data.get("labels", [])

    for seq, label in zip(file_data, file_labels):

        # Convertir secuencia normalizada + movimiento a vector final
        features = prepare_sequence_for_model(seq)

        data.append(features)
        labels.append(label)

data = np.array(data)
labels = np.array(labels)

print("\n====================================")
print("Total de muestras:", len(data))
print("Total de etiquetas:", len(labels))
print("Tamaño de entrada:", data.shape[1] if len(data) > 0 else "N/A")
print("Letras detectadas:", sorted(set(labels)))
print("====================================\n")

if len(data) < 2:
    print("No hay suficientes datos para entrenar.")
    exit()

# =============================
# Revisar cantidad por letra
# =============================

unique_labels, counts = np.unique(labels, return_counts=True)

print("Muestras por letra:")
for label, count in zip(unique_labels, counts):
    print(f"{label}: {count}")

print()

# =============================
# Separar entrenamiento/prueba
# =============================

# Si alguna clase tiene muy pocas muestras, stratify puede fallar.
# Por eso lo hacemos con try/except.
try:
    X_train, X_test, y_train, y_test = train_test_split(
        data,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels
    )
except ValueError:
    print("Aviso: algunas letras tienen pocas muestras. Se entrenará sin stratify.")
    X_train, X_test, y_train, y_test = train_test_split(
        data,
        labels,
        test_size=0.2,
        random_state=42
    )

# =============================
# Entrenar modelo
# =============================

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)

print("Entrenando modelo V2...")
model.fit(X_train, y_train)

# =============================
# Evaluación
# =============================

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print("\n====================================")
print(f"Accuracy: {accuracy * 100:.2f}%")
print("====================================\n")

print("Reporte de clasificación:")
print(classification_report(y_test, y_pred))

print("Matriz de confusión:")
print(confusion_matrix(y_test, y_pred))

# =============================
# Guardar modelo
# =============================

with open(MODEL_PATH, "wb") as f:
    pickle.dump(
        {
            "model": model,
            "sequence_length": 30,
            "features": "normalized_xyz_plus_motion",
            "labels": sorted(set(labels))
        },
        f
    )

print("\nModelo V2 guardado correctamente en:")
print(MODEL_PATH)