-- =============================================================================
-- Migración 001: Módulo RBAC y Administración (UP)
-- Práctica 4.3 - Administración de Vehículos IoT
-- =============================================================================

-- 1. Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (id, nombre) VALUES
    (1, 'ADMINISTRADOR'),
    (2, 'USUARIO'),
    (3, 'INVITADO');

-- 2. Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios predeterminados con contraseñas seguras PBKDF2:
-- admin@iot.com     -> admin12345
-- usuario@iot.com   -> usuario12345
-- invitado@iot.com  -> invitado12345
INSERT IGNORE INTO usuarios (id, email, password_hash, rol_id, activo) VALUES
    (1, 'admin@iot.com', 'pbkdf2:sha256:100000$132af87b9ab0726f712f5e26331cfabb$235cc46271ef27ba9703974da04ddcecdc0d97ec418c17739f9a471964ee1f68', 1, 1),
    (2, 'usuario@iot.com', 'pbkdf2:sha256:100000$fc29acde353e0465f2fd81100b4c804b$ea0e09638669dcf6f0a3c7e957700a9855353a5ce214db5db35070df04b21eb6', 2, 1),
    (3, 'invitado@iot.com', 'pbkdf2:sha256:100000$8e14da48174a2add9f18f75a911b1df8$09d7d937933fd08ce57e880d440177e381a668dcc5e59e165054ab887b67588a', 3, 1);

-- 3. Tabla de modelos de vehículos comerciales
CREATE TABLE IF NOT EXISTS modelos_vehiculo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modelos_vehiculo (id, nombre, descripcion) VALUES
    (1, 'Rover Explorer 4WD', 'Vehículo todoterreno con tracción de 4 ruedas y garra robótica');

-- 4. Tabla de sesiones temporales de invitados (5 minutos)
CREATE TABLE IF NOT EXISTS sesiones_invitado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    duracion_segundos INT DEFAULT 300,
    inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiracion DATETIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id_vehiculo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de auditoría administrativa y switch de soporte
CREATE TABLE IF NOT EXISTS auditoria_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    vehiculo_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id_vehiculo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Procedimientos de apoyo para usuarios y auditoría (si no existen)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_obtener_usuarios()
BEGIN
    SELECT u.id, u.email, u.rol_id, r.nombre AS rol, u.activo, u.creado_en
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    ORDER BY u.id ASC;
END //

CREATE PROCEDURE IF NOT EXISTS sp_crear_usuario(
    IN p_email VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_rol_id INT
)
BEGIN
    INSERT INTO usuarios (email, password_hash, rol_id, activo)
    VALUES (p_email, p_password_hash, p_rol_id, 1);
    SELECT LAST_INSERT_ID() AS id, p_email AS email, p_rol_id AS rol_id;
END //

CREATE PROCEDURE IF NOT EXISTS sp_obtener_auditoria()
BEGIN
    SELECT a.id, a.admin_id, u.email AS admin_email, a.vehiculo_id, a.accion, a.detalle, a.timestamp
    FROM auditoria_admin a
    JOIN usuarios u ON a.admin_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT 50;
END //
DELIMITER ;
