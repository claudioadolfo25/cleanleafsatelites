-- Migration 013: Explicit Schema, Table, Sequence and Function Grants for Staging and Production
-- Issue: Projects created with automatic table exposure disabled and automatic RLS enabled require explicit DCL GRANT statements.
-- Without explicit GRANTs, PostgreSQL has_table_privilege returns false even if RLS policies exist.

-- 1. Schema USAGE Grants
GRANT USAGE ON SCHEMA public TO authenticated, service_role, supabase_auth_admin, anon;

-- 2. Sequence and Specific Function EXECUTE Grants
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Grant EXECUTE on specific utility functions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated, service_role;

-- 3. Explicit Grants for GoTrue Auth Hook Daemon (supabase_auth_admin)
-- Revoke PUBLIC / authenticated / anon EXECUTE on custom_access_token_hook to enforce security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin, service_role;
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT SELECT ON public.tenants TO supabase_auth_admin;

-- 4. Explicit Table Grants for service_role (Full DML Access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_analisis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mediciones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumo TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observation_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observaciones_serie TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escenas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informe_escenas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suscripciones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes TO service_role;

-- 5. Explicit Minimal Table Grants for authenticated Role (Governed strictly by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_analisis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mediciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observation_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observaciones_serie TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escenas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informe_escenas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suscripciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planes TO authenticated;

-- 5a. Explicit Grants for audit_logs for authenticated:
-- authenticated needs SELECT (governed by Migration 011 RLS by tenant_id/super_admin).
-- authenticated MUST NOT have INSERT, UPDATE or DELETE permissions on audit_logs (retaining Migration 012 posture).
GRANT SELECT ON public.audit_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;

-- 6. Explicit ZERO Table Privileges for anon Role (Zero Trust)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 7. Ensure Default Privileges for any future tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
