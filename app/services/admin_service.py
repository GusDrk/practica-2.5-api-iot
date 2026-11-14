import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.database.mysql import Database
from app.utils.password import hash_password, verify_password

class AdminService:
    def __init__(self, db: Database):
        self.db = db

    def obtener_usuarios(self) -> List[Dict[str, Any]]:
        """Obtiene la lista de usuarios y sus roles."""
        try:
            return self.db.call("sp_obtener_usuarios")
        except Exception:
            sql = """
                SELECT u.id, u.email, u.rol_id, r.nombre AS rol, u.activo, u.creado_en
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                ORDER BY u.id ASC
            """
            return self.db.fetch_all(sql)

    def obtener_usuario_por_email(self, email: str) -> Optional[Dict[str, Any]]:
        sql = """
            SELECT u.id, u.email, u.password_hash, u.rol_id, r.nombre AS rol, u.activo
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = %s
            LIMIT 1
        """
        rows = self.db.fetch_all(sql, email)
        return rows[0] if rows else None

    def crear_usuario(self, email: str, password: str, rol_id: int) -> Dict[str, Any]:
        pwd_hash = hash_password(password)
        try:
            res = self.db.call("sp_crear_usuario", email, pwd_hash, rol_id)
            if res:
                return res[0]
        except Exception:
            pass

        sql = "INSERT INTO usuarios (email, password_hash, rol_id, activo) VALUES (%s, %s, %s, 1)"
        res = self.db.execute(sql, email, pwd_hash, rol_id)
        return {"id": res.get("lastrowid"), "email": email, "rol_id": rol_id}

    def actualizar_usuario(self, id_usuario: int, email: Optional[str] = None,
                           password: Optional[str] = None, rol_id: Optional[int] = None,
                           activo: Optional[bool] = None) -> Dict[str, Any]:
        updates = []
        params = []
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if password is not None:
            updates.append("password_hash = %s")
            params.append(hash_password(password))
        if rol_id is not None:
            updates.append("rol_id = %s")
            params.append(rol_id)
        if activo is not None:
            updates.append("activo = %s")
            params.append(1 if activo else 0)

        if not updates:
            return {"actualizado": False, "mensaje": "Sin campos para actualizar"}

        sql = f"UPDATE usuarios SET {', '.join(updates)} WHERE id = %s"
        params.append(id_usuario)
        res = self.db.execute(sql, *params)
        return {"actualizado": True, "afectados": res.get("rowcount")}

    def autenticar(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        user = self.obtener_usuario_por_email(email)
        if not user or not user.get("activo"):
            return None
        if verify_password(password, user.get("password_hash", "")):
            return {
                "id": user["id"],
                "email": user["email"],
                "rol_id": user["rol_id"],
                "rol": user.get("rol", "USUARIO")
            }
        return None

    def registrar_soporte(self, admin_id: int, vehiculo_id: int, habilitado: bool, motivo: str = "") -> Dict[str, Any]:
        accion = "SOPORTE_ACTIVADO" if habilitado else "SOPORTE_DESACTIVADO"
        sql = """
            INSERT INTO auditoria_admin (admin_id, vehiculo_id, accion, detalle)
            VALUES (%s, %s, %s, %s)
        """
        detalle = f"{motivo} | Estado: {'ON' if habilitado else 'OFF'}"
        self.db.execute(sql, admin_id, vehiculo_id, accion, detalle)
        return {"soporte_activo": habilitado, "vehiculo_id": vehiculo_id, "accion": accion}

    def obtener_auditoria(self) -> List[Dict[str, Any]]:
        try:
            return self.db.call("sp_obtener_auditoria")
        except Exception:
            sql = """
                SELECT a.id, a.admin_id, u.email AS admin_email, a.vehiculo_id, a.accion, a.detalle, a.timestamp
                FROM auditoria_admin a
                LEFT JOIN usuarios u ON a.admin_id = u.id
                ORDER BY a.timestamp DESC
                LIMIT 50
            """
            return self.db.fetch_all(sql)

    def crear_sesion_invitado(self, vehiculo_id: int, duracion_segundos: int = 300) -> Dict[str, Any]:
        token = secrets.token_urlsafe(24)
        inicio = datetime.utcnow()
        expiracion = inicio + timedelta(seconds=duracion_segundos)

        sql = """
            INSERT INTO sesiones_invitado (vehiculo_id, token, duracion_segundos, inicio, expiracion, activo)
            VALUES (%s, %s, %s, %s, %s, 1)
        """
        self.db.execute(sql, vehiculo_id, token, duracion_segundos,
                        inicio.strftime("%Y-%m-%d %H:%M:%S"),
                        expiracion.strftime("%Y-%m-%d %H:%M:%S"))

        return {
            "vehiculo_id": vehiculo_id,
            "token": token,
            "duracion_segundos": duracion_segundos,
            "expiracion": expiracion.isoformat() + "Z"
        }
