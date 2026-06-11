-- =============================================================================
-- 006_harden_api_grants.sql — A-7 de la auditoría QA (2026-06-11)
-- APLICADA en Supabase el 2026-06-11 (vía MCP, registrada como migración).
-- RLS ya está habilitado en todas las tablas (sin policies → PostgREST no ve
-- filas). Esto añade defensa en profundidad: aunque mañana alguien cree una
-- policy permisiva por error, los roles de la Data API no tienen GRANTs.
-- La app no se ve afectada: conecta como `postgres` (owner de las tablas).
-- service_role NO se toca (su key nunca es pública).
-- =============================================================================

-- Objetos existentes
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Objetos futuros creados por `postgres` (las migraciones de la app):
-- que no hereden grants hacia los roles de la Data API.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
