-- ====================================================
-- RESPALDO VERIFICABLE - PREVIO A FASE 4.3 (ADMINISTRACION)
-- Base de datos: vehiculo_iot en Amazon RDS
-- ====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Estructura y datos de `comandos`
CREATE TABLE `comandos` (
  `id_comando` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `nombre` varchar(60) COLLATE utf8mb4_general_ci NOT NULL,
  `codigo` int NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_comando`),
  UNIQUE KEY `uq_comando_codigo` (`id_vehiculo`,`codigo`),
  UNIQUE KEY `uq_comando_nombre` (`id_vehiculo`,`nombre`),
  CONSTRAINT `fk_comando_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (1, 1, 'AVANZAR', 1, 'W: activar salida Q5', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (2, 1, 'RETROCEDER', 2, 'S: activar salida Q4', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (3, 1, 'GIRAR_IZQUIERDA', 3, 'A: activar salida Q7', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (4, 1, 'GIRAR_DERECHA', 4, 'D: activar salida Q6', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (5, 1, 'SUBIR_GARRA', 5, 'U: activar salida Q3', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (6, 1, 'BAJAR_GARRA', 6, 'J: activar salida Q2', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (7, 1, 'BOCINA', 7, 'B: activar salida Q1', 1);
INSERT INTO `comandos` (`id_comando`, `id_vehiculo`, `nombre`, `codigo`, `descripcion`, `activo`) VALUES (8, 1, 'APAGAR_TODO', 8, 'Q: apagar todas las salidas', 1);

-- Estructura y datos de `demo_movimientos`
CREATE TABLE `demo_movimientos` (
  `id_demo_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_demo` int NOT NULL,
  `id_comando` int NOT NULL,
  `orden` int NOT NULL,
  `duracion_ms` int unsigned NOT NULL,
  `pausa_ms` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_demo_movimiento`),
  UNIQUE KEY `uq_demo_orden` (`id_demo`,`orden`),
  KEY `fk_mov_comando` (`id_comando`),
  CONSTRAINT `fk_mov_comando` FOREIGN KEY (`id_comando`) REFERENCES `comandos` (`id_comando`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mov_demo` FOREIGN KEY (`id_demo`) REFERENCES `demos` (`id_demo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (1, 1, 1, 1, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (2, 1, 2, 2, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (3, 1, 3, 3, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (4, 1, 4, 4, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (5, 1, 5, 5, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (6, 1, 6, 6, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (7, 1, 7, 7, 2000, 0);
INSERT INTO `demo_movimientos` (`id_demo_movimiento`, `id_demo`, `id_comando`, `orden`, `duracion_ms`, `pausa_ms`) VALUES (8, 1, 8, 8, 0, 0);

-- Estructura y datos de `demos`
CREATE TABLE `demos` (
  `id_demo` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `nombre` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_demo`),
  KEY `fk_demo_vehiculo` (`id_vehiculo`),
  CONSTRAINT `fk_demo_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `demos` (`id_demo`, `id_vehiculo`, `nombre`, `descripcion`, `activo`) VALUES (1, 1, 'Demo Arduino', 'Secuencia de movimientos del programa Arduino', 1);

-- Estructura y datos de `estado_vehiculo`
CREATE TABLE `estado_vehiculo` (
  `id_estado` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `id_comando` int DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `conectado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_estado`),
  UNIQUE KEY `id_vehiculo` (`id_vehiculo`),
  KEY `fk_estado_comando` (`id_comando`),
  CONSTRAINT `fk_estado_comando` FOREIGN KEY (`id_comando`) REFERENCES `comandos` (`id_comando`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_estado_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=420 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `estado_vehiculo` (`id_estado`, `id_vehiculo`, `id_comando`, `fecha_actualizacion`, `conectado`) VALUES (1, 1, 8, '2026-11-11 02:54:29', 1);

-- Estructura y datos de `historial_comandos`
CREATE TABLE `historial_comandos` (
  `id_historial` bigint NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `id_comando` int DEFAULT NULL,
  `fecha_hora` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `origen` varchar(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'MANUAL',
  PRIMARY KEY (`id_historial`),
  KEY `fk_historial_vehiculo` (`id_vehiculo`),
  KEY `fk_historial_comando` (`id_comando`),
  CONSTRAINT `fk_historial_comando` FOREIGN KEY (`id_comando`) REFERENCES `comandos` (`id_comando`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (1, 1, 1, '2026-10-26 18:46:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (2, 1, 1, '2026-10-27 01:45:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (3, 1, 8, '2026-10-27 01:45:52', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (4, 1, 1, '2026-10-27 01:48:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (5, 1, 8, '2026-10-27 01:49:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (6, 1, 1, '2026-10-27 19:02:12', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (7, 1, 2, '2026-10-27 19:02:19', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (8, 1, 8, '2026-10-27 19:02:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (9, 1, 1, '2026-11-07 18:48:01', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (10, 1, 8, '2026-11-07 18:48:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (11, 1, 1, '2026-11-08 02:19:22', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (12, 1, 8, '2026-11-08 02:19:22', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (13, 1, 1, '2026-11-08 02:19:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (14, 1, 8, '2026-11-08 02:19:29', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (15, 1, 5, '2026-11-08 02:19:33', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (16, 1, 8, '2026-11-08 02:19:38', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (17, 1, 8, '2026-11-08 02:24:30', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (18, 1, 6, '2026-11-08 02:24:39', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (19, 1, 8, '2026-11-08 02:24:42', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (20, 1, 1, '2026-11-08 02:40:15', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (21, 1, 8, '2026-11-08 02:40:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (22, 1, 4, '2026-11-08 02:40:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (23, 1, 8, '2026-11-08 02:40:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (24, 1, 3, '2026-11-08 02:40:18', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (25, 1, 8, '2026-11-08 02:40:20', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (26, 1, 8, '2026-11-08 02:40:21', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (27, 1, 5, '2026-11-08 02:40:21', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (28, 1, 8, '2026-11-08 02:40:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (29, 1, 7, '2026-11-08 02:40:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (30, 1, 8, '2026-11-08 02:40:24', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (31, 1, 6, '2026-11-08 02:40:25', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (32, 1, 8, '2026-11-08 02:40:26', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (33, 1, 8, '2026-11-08 02:42:28', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (34, 1, 1, '2026-11-09 05:18:30', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (35, 1, 8, '2026-11-09 05:18:30', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (36, 1, 8, '2026-11-09 05:18:31', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (37, 1, 8, '2026-11-09 05:18:32', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (38, 1, 8, '2026-11-09 05:20:35', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (39, 1, 1, '2026-11-09 05:22:28', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (40, 1, 2, '2026-11-09 05:22:31', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (41, 1, 8, '2026-11-09 05:22:32', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (42, 1, 8, '2026-11-09 05:22:32', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (43, 1, 8, '2026-11-09 05:22:33', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (44, 1, 8, '2026-11-09 05:24:46', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (45, 1, 8, '2026-11-09 05:48:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (46, 1, 1, '2026-11-09 17:48:58', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (47, 1, 4, '2026-11-09 17:49:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (48, 1, 2, '2026-11-09 17:49:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (49, 1, 3, '2026-11-09 17:49:07', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (50, 1, 8, '2026-11-09 17:49:09', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (51, 1, 5, '2026-11-09 17:49:14', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (52, 1, 8, '2026-11-09 17:49:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (53, 1, 8, '2026-11-09 17:49:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (54, 1, 8, '2026-11-09 17:49:18', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (55, 1, 8, '2026-11-09 17:49:18', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (56, 1, 5, '2026-11-09 17:51:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (57, 1, 7, '2026-11-09 17:51:58', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (58, 1, 6, '2026-11-09 17:52:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (59, 1, 5, '2026-11-09 17:52:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (60, 1, 1, '2026-11-09 17:52:48', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (61, 1, 8, '2026-11-09 17:52:50', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (62, 1, 1, '2026-11-09 17:52:51', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (63, 1, 2, '2026-11-09 17:52:52', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (64, 1, 3, '2026-11-09 17:52:53', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (65, 1, 4, '2026-11-09 17:52:54', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (66, 1, 1, '2026-11-09 17:52:54', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (67, 1, 8, '2026-11-09 17:52:54', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (68, 1, 1, '2026-11-09 17:52:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (69, 1, 4, '2026-11-09 17:52:59', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (70, 1, 1, '2026-11-09 17:53:01', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (71, 1, 2, '2026-11-09 17:53:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (72, 1, 3, '2026-11-09 17:53:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (73, 1, 2, '2026-11-09 17:53:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (74, 1, 8, '2026-11-09 17:53:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (75, 1, 2, '2026-11-09 17:53:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (76, 1, 3, '2026-11-09 17:53:20', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (77, 1, 8, '2026-11-09 17:53:21', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (78, 1, 3, '2026-11-09 17:53:32', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (79, 1, 8, '2026-11-09 17:53:36', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (80, 1, 2, '2026-11-09 17:53:36', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (81, 1, 8, '2026-11-09 17:53:39', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (82, 1, 5, '2026-11-09 17:53:43', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (83, 1, 6, '2026-11-09 17:53:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (84, 1, 7, '2026-11-09 17:53:48', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (85, 1, 8, '2026-11-09 17:53:57', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (86, 1, 1, '2026-11-09 18:01:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (87, 1, 8, '2026-11-09 18:01:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (88, 1, 3, '2026-11-09 18:01:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (89, 1, 4, '2026-11-09 18:01:21', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (90, 1, 8, '2026-11-09 18:01:37', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (91, 1, 8, '2026-11-09 18:01:39', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (92, 1, 6, '2026-11-09 18:01:42', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (93, 1, 7, '2026-11-09 18:01:45', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (94, 1, 5, '2026-11-09 18:01:51', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (95, 1, 1, '2026-11-10 04:09:25', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (96, 1, 8, '2026-11-10 04:09:26', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (97, 1, 8, '2026-11-10 05:33:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (98, 1, 4, '2026-11-10 05:33:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (99, 1, 2, '2026-11-10 05:42:39', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (100, 1, 8, '2026-11-10 05:42:39', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (101, 1, 2, '2026-11-10 05:42:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (102, 1, 8, '2026-11-10 05:42:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (103, 1, 1, '2026-11-10 05:42:41', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (104, 1, 8, '2026-11-10 05:42:41', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (105, 1, 8, '2026-11-10 05:42:41', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (106, 1, 1, '2026-11-10 18:13:04', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (107, 1, 8, '2026-11-10 18:13:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (108, 1, 1, '2026-11-10 18:13:54', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (109, 1, 4, '2026-11-10 18:13:55', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (110, 1, 8, '2026-11-10 18:13:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (111, 1, 8, '2026-11-10 18:13:57', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (112, 1, 8, '2026-11-10 18:13:58', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (113, 1, 2, '2026-11-10 18:13:59', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (114, 1, 3, '2026-11-10 18:14:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (115, 1, 8, '2026-11-10 18:14:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (116, 1, 8, '2026-11-10 18:14:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (117, 1, 8, '2026-11-10 18:14:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (118, 1, 8, '2026-11-10 18:14:31', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (119, 1, 2, '2026-11-10 18:16:42', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (120, 1, 8, '2026-11-10 18:16:44', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (121, 1, 4, '2026-11-10 18:16:45', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (122, 1, 8, '2026-11-10 18:16:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (123, 1, 4, '2026-11-10 18:16:48', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (124, 1, 8, '2026-11-10 18:16:49', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (125, 1, 3, '2026-11-10 18:16:50', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (126, 1, 8, '2026-11-10 18:16:51', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (127, 1, 2, '2026-11-10 18:16:52', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (128, 1, 8, '2026-11-10 18:16:53', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (129, 1, 1, '2026-11-10 18:16:59', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (130, 1, 8, '2026-11-10 18:17:00', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (131, 1, 2, '2026-11-10 18:17:01', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (132, 1, 3, '2026-11-10 18:17:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (133, 1, 8, '2026-11-10 18:17:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (134, 1, 8, '2026-11-10 18:17:07', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (135, 1, 3, '2026-11-10 18:17:07', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (136, 1, 8, '2026-11-10 18:17:09', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (137, 1, 8, '2026-11-10 18:17:11', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (138, 1, 4, '2026-11-10 18:17:12', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (139, 1, 8, '2026-11-10 18:17:14', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (140, 1, 4, '2026-11-10 18:17:15', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (141, 1, 8, '2026-11-10 18:17:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (142, 1, 1, '2026-11-10 18:17:24', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (143, 1, 8, '2026-11-10 18:17:25', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (144, 1, 4, '2026-11-10 18:38:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (145, 1, 8, '2026-11-10 18:38:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (146, 1, 4, '2026-11-10 18:38:14', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (147, 1, 1, '2026-11-10 18:38:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (148, 1, 3, '2026-11-10 18:38:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (149, 1, 2, '2026-11-10 18:38:18', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (150, 1, 4, '2026-11-10 18:38:19', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (151, 1, 8, '2026-11-10 18:38:20', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (152, 1, 4, '2026-11-10 18:38:24', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (153, 1, 2, '2026-11-10 18:38:25', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (154, 1, 3, '2026-11-10 18:38:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (155, 1, 1, '2026-11-10 18:38:28', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (156, 1, 4, '2026-11-10 18:38:29', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (157, 1, 8, '2026-11-10 18:38:30', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (158, 1, 2, '2026-11-11 02:28:51', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (159, 1, 8, '2026-11-11 02:28:53', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (160, 1, 2, '2026-11-11 02:28:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (161, 1, 8, '2026-11-11 02:28:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (162, 1, 8, '2026-11-11 02:28:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (163, 1, 4, '2026-11-11 02:29:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (164, 1, 1, '2026-11-11 02:29:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (165, 1, 3, '2026-11-11 02:29:04', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (166, 1, 2, '2026-11-11 02:29:04', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (167, 1, 8, '2026-11-11 02:29:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (168, 1, 4, '2026-11-11 02:30:26', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (169, 1, 2, '2026-11-11 02:30:29', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (170, 1, 8, '2026-11-11 02:30:31', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (171, 1, 3, '2026-11-11 02:30:32', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (172, 1, 8, '2026-11-11 02:30:33', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (173, 1, 4, '2026-11-11 02:30:35', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (174, 1, 8, '2026-11-11 02:30:38', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (175, 1, 1, '2026-11-11 02:30:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (176, 1, 8, '2026-11-11 02:30:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (177, 1, 8, '2026-11-11 02:30:42', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (178, 1, 1, '2026-11-11 02:30:43', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (179, 1, 8, '2026-11-11 02:30:44', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (180, 1, 3, '2026-11-11 02:30:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (181, 1, 8, '2026-11-11 02:30:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (182, 1, 5, '2026-11-11 02:30:49', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (183, 1, 6, '2026-11-11 02:30:52', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (184, 1, 7, '2026-11-11 02:30:54', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (185, 1, 8, '2026-11-11 02:30:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (186, 1, 1, '2026-11-11 02:31:21', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (187, 1, 8, '2026-11-11 02:31:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (188, 1, 2, '2026-11-11 02:31:24', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (189, 1, 8, '2026-11-11 02:31:25', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (190, 1, 4, '2026-11-11 02:31:26', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (191, 1, 8, '2026-11-11 02:31:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (192, 1, 3, '2026-11-11 02:31:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (193, 1, 8, '2026-11-11 02:31:28', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (194, 1, 1, '2026-11-11 02:51:43', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (195, 1, 8, '2026-11-11 02:51:43', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (196, 1, 2, '2026-11-11 02:51:45', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (197, 1, 8, '2026-11-11 02:51:45', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (198, 1, 3, '2026-11-11 02:51:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (199, 1, 8, '2026-11-11 02:51:47', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (200, 1, 2, '2026-11-11 02:51:48', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (201, 1, 8, '2026-11-11 02:51:49', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (202, 1, 4, '2026-11-11 02:51:50', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (203, 1, 8, '2026-11-11 02:51:51', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (204, 1, 1, '2026-11-11 02:51:53', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (205, 1, 3, '2026-11-11 02:51:55', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (206, 1, 1, '2026-11-11 02:51:56', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (207, 1, 4, '2026-11-11 02:51:58', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (208, 1, 1, '2026-11-11 02:51:59', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (209, 1, 3, '2026-11-11 02:52:01', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (210, 1, 8, '2026-11-11 02:52:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (211, 1, 1, '2026-11-11 02:52:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (212, 1, 8, '2026-11-11 02:52:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (213, 1, 6, '2026-11-11 02:52:07', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (214, 1, 8, '2026-11-11 02:52:10', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (215, 1, 5, '2026-11-11 02:52:11', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (216, 1, 8, '2026-11-11 02:52:13', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (217, 1, 7, '2026-11-11 02:52:14', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (218, 1, 8, '2026-11-11 02:52:15', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (219, 1, 7, '2026-11-11 02:52:16', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (220, 1, 8, '2026-11-11 02:52:17', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (221, 1, 7, '2026-11-11 02:53:30', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (222, 1, 8, '2026-11-11 02:53:31', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (223, 1, 6, '2026-11-11 02:53:40', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (224, 1, 8, '2026-11-11 02:53:43', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (225, 1, 5, '2026-11-11 02:53:46', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (226, 1, 8, '2026-11-11 02:53:48', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (227, 1, 4, '2026-11-11 02:54:00', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (228, 1, 8, '2026-11-11 02:54:01', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (229, 1, 2, '2026-11-11 02:54:02', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (230, 1, 8, '2026-11-11 02:54:03', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (231, 1, 3, '2026-11-11 02:54:04', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (232, 1, 8, '2026-11-11 02:54:04', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (233, 1, 1, '2026-11-11 02:54:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (234, 1, 8, '2026-11-11 02:54:05', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (235, 1, 3, '2026-11-11 02:54:06', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (236, 1, 8, '2026-11-11 02:54:07', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (237, 1, 3, '2026-11-11 02:54:08', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (238, 1, 8, '2026-11-11 02:54:10', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (239, 1, 1, '2026-11-11 02:54:11', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (240, 1, 8, '2026-11-11 02:54:14', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (241, 1, 1, '2026-11-11 02:54:15', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (242, 1, 8, '2026-11-11 02:54:22', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (243, 1, 1, '2026-11-11 02:54:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (244, 1, 8, '2026-11-11 02:54:23', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (245, 1, 2, '2026-11-11 02:54:24', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (246, 1, 8, '2026-11-11 02:54:26', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (247, 1, 2, '2026-11-11 02:54:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (248, 1, 8, '2026-11-11 02:54:27', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (249, 1, 3, '2026-11-11 02:54:28', 'MANUAL');
INSERT INTO `historial_comandos` (`id_historial`, `id_vehiculo`, `id_comando`, `fecha_hora`, `origen`) VALUES (250, 1, 8, '2026-11-11 02:54:29', 'MANUAL');

-- Estructura y datos de `vehiculos`
CREATE TABLE `vehiculos` (
  `id_vehiculo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `modelo` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `microcontrolador` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_vehiculo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `vehiculos` (`id_vehiculo`, `nombre`, `modelo`, `descripcion`, `microcontrolador`, `fecha_registro`, `activo`) VALUES (1, 'Excavadora IoT', 'Modelo X', 'Vehiculo controlado por ESP8266 y registro 74HC595', 'ESP8266', '2026-10-26 18:28:51', 1);

SET FOREIGN_KEY_CHECKS = 1;
