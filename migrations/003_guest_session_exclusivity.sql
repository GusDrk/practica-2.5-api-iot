-- Aplicar una vez en instalaciones que ya ejecutaron 001_add_rbac_up.sql.
-- Una sesión de invitado puede ser reclamada por una sola persona.
ALTER TABLE sesiones_invitado
    ADD COLUMN ocupada BOOLEAN NOT NULL DEFAULT FALSE AFTER activo,
    ADD COLUMN accedida_en DATETIME NULL AFTER ocupada,
    ADD INDEX idx_sesiones_invitado_vigencia (activo, expiracion);
