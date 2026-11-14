-- =============================================================================
-- Migración 001: Módulo RBAC y Administración (DOWN)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_obtener_auditoria;
DROP PROCEDURE IF EXISTS sp_crear_usuario;
DROP PROCEDURE IF EXISTS sp_obtener_usuarios;

DROP TABLE IF EXISTS auditoria_admin;
DROP TABLE IF EXISTS sesiones_invitado;
DROP TABLE IF EXISTS modelos_vehiculo;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;
