import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.database.mysql import Database
from app.utils.password import hash_password, verify_password

class AdminService:
    def __init__(self, db: Database):
        self.db = db

    # ─────────────────────────────────────────────────────────────
    # USUARIOS Y AUTENTICACIÓN
    # ─────────────────────────────────────────────────────────────
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

    # ─────────────────────────────────────────────────────────────
    # MODELOS DE VEHÍCULOS (ADMINISTRADOR)
    # ─────────────────────────────────────────────────────────────
    def obtener_modelos(self) -> List[Dict[str, Any]]:
        sql = "SELECT id, nombre, descripcion, creado_en FROM modelos_vehiculo ORDER BY id ASC"
        return self.db.fetch_all(sql)

    def crear_modelo(self, nombre: str, descripcion: Optional[str] = None) -> Dict[str, Any]:
        sql = "INSERT INTO modelos_vehiculo (nombre, descripcion) VALUES (%s, %s)"
        res = self.db.execute(sql, nombre, descripcion or "")
        return {"id": res.get("lastrowid"), "nombre": nombre, "descripcion": descripcion}

    def actualizar_modelo(self, id_modelo: int, nombre: str, descripcion: Optional[str] = None) -> Dict[str, Any]:
        sql = "UPDATE modelos_vehiculo SET nombre = %s, descripcion = %s WHERE id = %s"
        res = self.db.execute(sql, nombre, descripcion or "", id_modelo)
        return {"actualizado": True, "afectados": res.get("rowcount")}

    # ─────────────────────────────────────────────────────────────
    # UNIDADES FÍSICAS E INVENTARIO (ADMINISTRADOR)
    # ─────────────────────────────────────────────────────────────
    def obtener_inventario(self) -> List[Dict[str, Any]]:
        sql = """
            SELECT v.id_vehiculo, v.nombre, v.modelo, v.descripcion, v.microcontrolador,
                   v.fecha_registro, v.activo, v.usuario_id, u.email AS cliente_email
            FROM vehiculos v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            ORDER BY v.id_vehiculo ASC
        """
        return self.db.fetch_all(sql)

    def crear_unidad(self, id_vehiculo: Optional[int], nombre: str, modelo: Optional[str],
                     descripcion: Optional[str], microcontrolador: Optional[str],
                     usuario_id: Optional[int] = None) -> Dict[str, Any]:
        if id_vehiculo:
            sql = """
                INSERT INTO vehiculos (id_vehiculo, nombre, modelo, descripcion, microcontrolador, activo, usuario_id)
                VALUES (%s, %s, %s, %s, %s, 1, %s)
            """
            self.db.execute(sql, id_vehiculo, nombre, modelo or "", descripcion or "", microcontrolador or "ESP8266", usuario_id)
            nuevo_id = id_vehiculo
        else:
            sql = """
                INSERT INTO vehiculos (nombre, modelo, descripcion, microcontrolador, activo, usuario_id)
                VALUES (%s, %s, %s, %s, 1, %s)
            """
            res = self.db.execute(sql, nombre, modelo or "", descripcion or "", microcontrolador or "ESP8266", usuario_id)
            nuevo_id = res.get("lastrowid")

        return {"id_vehiculo": nuevo_id, "nombre": nombre, "modelo": modelo, "usuario_id": usuario_id}

    def asignar_vehiculo(self, id_vehiculo: int, usuario_id: Optional[int], admin_id: int = 1) -> Dict[str, Any]:
        sql = "UPDATE vehiculos SET usuario_id = %s WHERE id_vehiculo = %s"
        self.db.execute(sql, usuario_id, id_vehiculo)

        # Registrar en auditoría
        detalle = f"Vehículo #{id_vehiculo} asignado a usuario ID {usuario_id}" if usuario_id else f"Vehículo #{id_vehiculo} desasignado (inventario libre)"
        self.registrar_soporte(admin_id, id_vehiculo, False, motivo=detalle)
        return {"asignado": True, "id_vehiculo": id_vehiculo, "usuario_id": usuario_id}

    # ─────────────────────────────────────────────────────────────
    # CLIENTES Y ESTADÍSTICAS DASHBOARD (ADMINISTRADOR)
    # ─────────────────────────────────────────────────────────────
    def obtener_clientes(self) -> List[Dict[str, Any]]:
        sql = """
            SELECT u.id, u.email, u.activo, u.creado_en,
                   COUNT(v.id_vehiculo) AS total_vehiculos
            FROM usuarios u
            LEFT JOIN vehiculos v ON v.usuario_id = u.id
            WHERE u.rol_id = 2
            GROUP BY u.id, u.email, u.activo, u.creado_en
            ORDER BY u.id ASC
        """
        return self.db.fetch_all(sql)

    def obtener_estadisticas(self) -> Dict[str, Any]:
        tot_veh = self.db.fetch_all("SELECT COUNT(*) AS c FROM vehiculos")[0]["c"]
        act_veh = self.db.fetch_all("SELECT COUNT(*) AS c FROM vehiculos WHERE activo = 1")[0]["c"]
        tot_cli = self.db.fetch_all("SELECT COUNT(*) AS c FROM usuarios WHERE rol_id = 2")[0]["c"]
        tot_mod = self.db.fetch_all("SELECT COUNT(*) AS c FROM modelos_vehiculo")[0]["c"]
        tot_aud = self.db.fetch_all("SELECT COUNT(*) AS c FROM auditoria_admin")[0]["c"]

        return {
            "total_vehiculos": tot_veh,
            "vehiculos_activos": act_veh,
            "total_clientes": tot_cli,
            "total_modelos": tot_mod,
            "total_auditorias": tot_aud
        }

    # ─────────────────────────────────────────────────────────────
    # DEMOSTRACIONES DE FÁBRICA (ADMINISTRADOR)
    # ─────────────────────────────────────────────────────────────
    def obtener_demos_fabrica(self) -> List[Dict[str, Any]]:
        sql = """
            SELECT d.id_demo, d.id_vehiculo, d.nombre, d.descripcion, d.activo, d.es_fabrica,
                   v.nombre AS vehiculo_nombre
            FROM demos d
            LEFT JOIN vehiculos v ON d.id_vehiculo = v.id_vehiculo
            WHERE d.es_fabrica = 1
            ORDER BY d.id_demo ASC
        """
        return self.db.fetch_all(sql)

    def crear_demo_fabrica(self, id_vehiculo: int, nombre: str, descripcion: Optional[str] = None) -> Dict[str, Any]:
        sql = """
            INSERT INTO demos (id_vehiculo, nombre, descripcion, activo, es_fabrica)
            VALUES (%s, %s, %s, 1, 1)
        """
        res = self.db.execute(sql, id_vehiculo, nombre, descripcion or "")
        return {"id_demo": res.get("lastrowid"), "nombre": nombre, "es_fabrica": True}

    # ─────────────────────────────────────────────────────────────
    # FUNCIONALIDADES EXCLUSIVAS DEL USUARIO (COMPRADOR)
    # ─────────────────────────────────────────────────────────────
    def obtener_mis_vehiculos(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Devuelve únicamente los vehículos asignados al usuario comprador."""
        sql = """
            SELECT v.id_vehiculo, v.nombre, v.modelo, v.descripcion, v.microcontrolador, v.activo
            FROM vehiculos v
            WHERE v.usuario_id = %s AND v.activo = 1
            ORDER BY v.id_vehiculo ASC
        """
        return self.db.fetch_all(sql, usuario_id)

    def obtener_mis_demos(self, usuario_id: int, id_vehiculo: Optional[int] = None) -> List[Dict[str, Any]]:
        """Demos disponibles para el usuario: sus demos propias + demos de fábrica."""
        if id_vehiculo:
            sql = """
                SELECT id_demo, id_vehiculo, nombre, descripcion, activo, es_fabrica, usuario_id
                FROM demos
                WHERE id_vehiculo = %s AND (usuario_id = %s OR es_fabrica = 1) AND activo = 1
                ORDER BY id_demo ASC
            """
            return self.db.fetch_all(sql, id_vehiculo, usuario_id)
        else:
            sql = """
                SELECT id_demo, id_vehiculo, nombre, descripcion, activo, es_fabrica, usuario_id
                FROM demos
                WHERE (usuario_id = %s OR es_fabrica = 1) AND activo = 1
                ORDER BY id_demo ASC
            """
            return self.db.fetch_all(sql, usuario_id)

    def crear_mi_demo(self, usuario_id: int, id_vehiculo: int, nombre: str, descripcion: Optional[str] = None) -> Dict[str, Any]:
        sql = """
            INSERT INTO demos (id_vehiculo, nombre, descripcion, activo, es_fabrica, usuario_id)
            VALUES (%s, %s, %s, 1, 0, %s)
        """
        res = self.db.execute(sql, id_vehiculo, nombre, descripcion or "", usuario_id)
        return {"id_demo": res.get("lastrowid"), "nombre": nombre, "usuario_id": usuario_id, "es_fabrica": False}

    def eliminar_mi_demo(self, usuario_id: int, id_demo: int) -> Dict[str, Any]:
        sql = "DELETE FROM demos WHERE id_demo = %s AND usuario_id = %s AND es_fabrica = 0"
        res = self.db.execute(sql, id_demo, usuario_id)
        return {"eliminado": True, "afectados": res.get("rowcount")}

    # ─────────────────────────────────────────────────────────────
    # AUDITORÍA Y SOPORTE
    # ─────────────────────────────────────────────────────────────
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

    # ─────────────────────────────────────────────────────────────
    # SESIÓN DE INVITADO CON QR (15 SEGUNDOS)
    # ─────────────────────────────────────────────────────────────
    def crear_sesion_invitado(self, vehiculo_id: int, duracion_segundos: int = 45) -> Dict[str, Any]:
        token = secrets.token_urlsafe(16)
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
