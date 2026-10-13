
import os
from pathlib import Path
from contextlib import contextmanager

import mysql.connector
from dotenv import load_dotenv


# Cargar .env desde la raíz del proyecto
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)


class Database:

    def __init__(self):
        self.config = {
            "host": os.getenv("DB_HOST") or "127.0.0.1",
            "port": int(os.getenv("DB_PORT") or "3306"),
            "user": os.getenv("DB_USER") or "root",
            "password": os.getenv("DB_PASSWORD", ""),
            "database": os.getenv("DB_NAME") or "vehiculo_iot",
            "connection_timeout": 10,
            "use_pure": True
        }

    @contextmanager
    def connection(self):
        conn = None

        try:
            conn = mysql.connector.connect(**self.config)

            yield conn

            conn.commit()

        except mysql.connector.Error as error:
            if conn is not None:
                conn.rollback()

            print(f"Error de MySQL: {error}")
            raise

        except Exception:
            if conn is not None:
                conn.rollback()
            raise

        finally:
            if conn is not None and conn.is_connected():
                conn.close()

    def call(self, name: str, *params, conn=None):
        """
        Ejecuta un procedimiento almacenado MySQL.

        name: nombre del procedimiento almacenado
        params: parámetros del procedimiento
        conn: conexión existente opcional

        Devuelve los registros en forma de diccionarios.
        """

        # Usar una conexión propia si no se proporciona
        if conn is None:
            with self.connection() as connection:
                return self.call(
                    name,
                    *params,
                    conn=connection
                )

        cursor = conn.cursor(dictionary=True)

        try:
            placeholders = ", ".join(
                ["%s"] * len(params)
            )

            query = f"CALL `{name}`({placeholders})"

            cursor.execute(query, params)

            rows = (
                cursor.fetchall()
                if cursor.with_rows
                else []
            )

            # Consumir los resultados adicionales de MySQL
            while cursor.nextset():
                if cursor.with_rows:
                    cursor.fetchall()

            return rows

        finally:
            cursor.close()
