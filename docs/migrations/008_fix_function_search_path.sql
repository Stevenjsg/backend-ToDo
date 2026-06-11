-- =============================================================================
-- 008_fix_function_search_path.sql — warning del linter de Supabase
-- (function_search_path_mutable). APLICADA el 2026-06-11 (vía MCP).
-- Fija el search_path del trigger para evitar resolución de objetos por un
-- path manipulable por el rol llamante.
-- =============================================================================
ALTER FUNCTION public.set_fecha_actualizacion() SET search_path = '';
