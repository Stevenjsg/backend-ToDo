-- =============================================================================
-- backend-ToDo — Esquema PostgreSQL alineado con el código (repositorios/*)
-- Destino: Supabase (BD "postgres", esquema "public")
-- =============================================================================
-- NOTA: NO usar "CREATE DATABASE" en Supabase. Ejecuta este script en el
-- SQL Editor de Supabase o como migración (supabase migration new init).
-- Idempotente: usa IF NOT EXISTS y DO $$ ... $$ para los ENUM.
-- =============================================================================

-- Extensión para gen_random_uuid() (en Supabase suele venir habilitada)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridad_enum') THEN
        CREATE TYPE prioridad_enum AS ENUM ('baja', 'media', 'alta');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_tipo_enum') THEN
        CREATE TYPE item_tipo_enum AS ENUM ('task', 'note', 'reminder');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_proyecto_enum') THEN
        CREATE TYPE rol_proyecto_enum AS ENUM ('owner', 'editor', 'viewer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_sesion_pomodoro_enum') THEN
        CREATE TYPE tipo_sesion_pomodoro_enum AS ENUM ('trabajo', 'descanso_corto', 'descanso_largo');
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- Trigger genérico para mantener fecha_actualizacion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    uuid            UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),  -- identificador público (rutas)
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255),
    avatar_url      VARCHAR(512),
    bio             TEXT,
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- proyectos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    owner_id            INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre              VARCHAR(255) NOT NULL,
    descripcion         TEXT,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_owner_id ON proyectos(owner_id);

DROP TRIGGER IF EXISTS trg_proyectos_updated ON proyectos;
CREATE TRIGGER trg_proyectos_updated
    BEFORE UPDATE ON proyectos
    FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

-- -----------------------------------------------------------------------------
-- miembros_proyecto (relación N:M usuarios <-> proyectos con rol)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS miembros_proyecto (
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    rol         rol_proyecto_enum NOT NULL DEFAULT 'viewer',
    -- Clave primaria compuesta => evita membresías duplicadas.
    -- El código maneja el error 23505 (unique_violation) sobre esta constraint.
    PRIMARY KEY (usuario_id, proyecto_id)
);

CREATE INDEX IF NOT EXISTS idx_miembros_proyecto_id ON miembros_proyecto(proyecto_id);

-- -----------------------------------------------------------------------------
-- items (tareas / notas / recordatorios) — reemplaza a la antigua "tareas"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),  -- identificador público (rutas)
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proyecto_id         INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,  -- NULL => item personal
    tipo                item_tipo_enum NOT NULL DEFAULT 'task',
    titulo              VARCHAR(255) NOT NULL,
    descripcion         TEXT,
    completada          BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento   TIMESTAMPTZ,
    prioridad           prioridad_enum DEFAULT 'media',
    etiquetas           TEXT[] NOT NULL DEFAULT '{}',
    regla_recurrencia   TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_usuario_id  ON items(usuario_id);
CREATE INDEX IF NOT EXISTS idx_items_proyecto_id ON items(proyecto_id);

DROP TRIGGER IF EXISTS trg_items_updated ON items;
CREATE TRIGGER trg_items_updated
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

-- -----------------------------------------------------------------------------
-- pomodoro_sesiones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pomodoro_sesiones (
    id               SERIAL PRIMARY KEY,
    usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    item_id          INTEGER REFERENCES items(id) ON DELETE SET NULL,  -- la sesión sobrevive al borrado del item
    fecha_inicio     TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- el INSERT del código NO la envía
    duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
    tipo_sesion      tipo_sesion_pomodoro_enum NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_usuario_id ON pomodoro_sesiones(usuario_id);

-- =============================================================================
-- RLS — ACTIVO en producción (auditoría QA A-7, cerrado el 2026-06-11).
-- Este backend se conecta con pg.Pool (no supabase-js): la autorización de
-- negocio la hace la app. RLS + revocación de grants cierran la API PostgREST
-- auto-generada (roles anon/authenticated sin acceso). Ver migraciones
-- 006_harden_api_grants.sql (revokes) y 007_app_role_minimo.sql (rol de app
-- de mínimo privilegio + policies app_all).
-- =============================================================================
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos           ENABLE ROW LEVEL SECURITY;
