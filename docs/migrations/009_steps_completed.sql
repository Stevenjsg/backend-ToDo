-- =============================================================================
-- 009_steps_completed.sql — Estado de los checkboxes de pasos de un bloque.
-- APLICADA en Supabase el 2026-06-15 (vía MCP, registrada como migración).
-- Array JSONB de booleans alineado por índice con los pasos extraídos de la
-- descripción del bloque ("Pasos:\n1. ...\n2. ..."). Permite persistir el
-- avance paso a paso dentro de la vista de detalle de la tarea (ROADMAP F4).
-- Los grants/policies son a nivel de tabla (006/007), así que la nueva columna
-- queda cubierta automáticamente para btaskora_app. Idempotente.
-- =============================================================================
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb;
