-- =============================================================================
-- 003_eventos.sql — Instrumentación de producto (ROADMAP F1)
-- Métrica clave: % de bloques editados/borrados en la revisión IA (SDD §18.5).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS eventos (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo        VARCHAR(64) NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_tipo  ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);

-- Consulta de referencia: % medio de bloques editados por confirmación
-- SELECT AVG( (payload->>'editados')::float / NULLIF((payload->>'propuestos')::float, 0) )
-- FROM eventos WHERE tipo = 'ai_split_confirmed';
