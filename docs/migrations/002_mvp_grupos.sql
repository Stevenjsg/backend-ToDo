-- =============================================================================
-- 002_mvp_grupos.sql — MVP "grupos": sub-tareas, asignación y estimación
-- Ejecutar en el SQL Editor de Supabase. Idempotente (IF NOT EXISTS).
-- =============================================================================

-- Sub-tareas: un item puede colgar de otro item (bloque de un tema).
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES items(id) ON DELETE CASCADE;

-- Reparto por persona: a quién se le asigna el bloque.
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- Estimación en pomodoros del bloque.
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS pomodoros_estimados INTEGER CHECK (pomodoros_estimados > 0);

CREATE INDEX IF NOT EXISTS idx_items_parent_id   ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_assignee_id ON items(assignee_id);

-- pomodoro_sesiones.item_id ya existe (ver schema.sql); índice para progreso.
CREATE INDEX IF NOT EXISTS idx_pomodoro_item_id ON pomodoro_sesiones(item_id);
