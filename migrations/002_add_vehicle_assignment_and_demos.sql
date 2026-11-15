-- =============================================================================
-- Migración 002: Asignación de Vehículos a Clientes y Demos Propias
-- Práctica 4.3 - ADMINISTRACIÓN (RBAC & Asignaciones)
-- =============================================================================

USE vehiculo_iot;

-- 1. Agregar columna de asignación de cliente a la tabla vehiculos si no existe
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'vehiculo_iot' 
      AND TABLE_NAME = 'vehiculos' 
      AND COLUMN_NAME = 'usuario_id'
);

SET @sql_stmt = IF(@col_exists = 0, 
    'ALTER TABLE vehiculos ADD COLUMN usuario_id INT NULL', 
    'SELECT "Columna usuario_id ya existe en vehiculos"'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Agregar columnas de demos de fábrica y demos de usuario si no existen
SET @col_demo_fabrica = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'vehiculo_iot' 
      AND TABLE_NAME = 'demos' 
      AND COLUMN_NAME = 'es_fabrica'
);

SET @sql_stmt = IF(@col_demo_fabrica = 0, 
    'ALTER TABLE demos ADD COLUMN es_fabrica BOOLEAN DEFAULT TRUE', 
    'SELECT "Columna es_fabrica ya existe en demos"'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_demo_user = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'vehiculo_iot' 
      AND TABLE_NAME = 'demos' 
      AND COLUMN_NAME = 'usuario_id'
);

SET @sql_stmt = IF(@col_demo_user = 0, 
    'ALTER TABLE demos ADD COLUMN usuario_id INT NULL', 
    'SELECT "Columna usuario_id ya existe en demos"'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Asignación inicial de ejemplo: Vehículo #1 asignado al usuario 'usuario' (ID 2)
UPDATE vehiculos SET usuario_id = 2 WHERE id_vehiculo = 1;

-- 4. Asegurar que las demos iniciales se clasifiquen como de fábrica
UPDATE demos SET es_fabrica = 1 WHERE usuario_id IS NULL;
