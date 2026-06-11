-- =============================================================================
-- 005_reporte_compartible.sql — Link público de solo lectura del progreso
-- (ROADMAP F4 / SDD §18.1: puente estudiante → profesor)
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- =============================================================================

-- Token opaco del reporte compartible. NULL = no compartido. Un solo link
-- vivo por grupo; revocar = poner a NULL. UNIQUE crea el índice de búsqueda.
ALTER TABLE proyectos
    ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;

-- Cuándo se generó (auditoría simple / mostrar "compartido desde ...").
ALTER TABLE proyectos
    ADD COLUMN IF NOT EXISTS share_token_creado TIMESTAMPTZ;
