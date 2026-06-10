-- =============================================================================
-- 004_entregable.sql — Tipo y tamaño del entregable (ROADMAP F3 / SDD §18.5)
-- Estructura el input para la IA sin pedir redacción al estudiante (taps).
-- Idempotente.
-- =============================================================================

-- Tipo de trabajo: 'ensayo' | 'investigacion' | 'exposicion' | 'desarrollo'
-- | 'informe' | 'maqueta' | 'ejercicios' | 'otro' (validado en la app)
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS tipo_entregable VARCHAR(32);

-- Tamaño aproximado en texto libre: "10 páginas", "15 min", "3 sprints"...
ALTER TABLE items
    ADD COLUMN IF NOT EXISTS tamano_entregable VARCHAR(120);
