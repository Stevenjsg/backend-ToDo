-- =============================================================================
-- 007_app_role_minimo.sql — A-3.4 de la auditoría QA (2026-06-11)
-- APLICADA en Supabase el 2026-06-11 (vía MCP, registrada como migración).
-- Rol de mínimo privilegio para la app (en lugar del rol `postgres`).
--
-- Para ACTIVARLO (acción manual de Steven):
--   1. SQL Editor:  ALTER ROLE btaskora_app WITH PASSWORD '<larga-aleatoria>';
--   2. Cambiar DATABASE_URL en Render/.env:
--      postgres://btaskora_app.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
--   3. Reiniciar el servicio y probar login + listar tareas.
-- Hasta entonces la app sigue conectando como `postgres` sin cambios.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'btaskora_app') THEN
    CREATE ROLE btaskora_app LOGIN NOINHERIT;
  END IF;
END
$$;

-- Solo lo que la app necesita: CRUD sobre las tablas y uso de secuencias.
GRANT USAGE ON SCHEMA public TO btaskora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO btaskora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO btaskora_app;

-- Futuras tablas/secuencias creadas por `postgres` (migraciones).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO btaskora_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO btaskora_app;

-- btaskora_app NO es owner → RLS le aplica. La autorización de negocio la
-- hace la app (roles owner/editor/viewer); estas policies solo dejan pasar
-- al rol de la app. anon/authenticated siguen sin policy y sin grants.
CREATE POLICY app_all ON public.usuarios          FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.proyectos         FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.miembros_proyecto FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.items             FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.pomodoro_sesiones FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.eventos           FOR ALL TO btaskora_app USING (true) WITH CHECK (true);
