-- Migration 013: Explicit Schema, Table, Sequence, Function Grants and Auth Hook Fix
-- Issue 1: Projects created with automatic table exposure disabled require explicit DCL GRANT statements.
-- Issue 2: custom_access_token_hook must initialize app_metadata JSON object when setting nested claims
-- and preserve top-level claims.role as the Postgres DB role ('authenticated').

-- 1. Schema USAGE Grants
GRANT USAGE ON SCHEMA public TO authenticated, service_role, supabase_auth_admin;
REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Sequence and Specific Function EXECUTE Grants
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Grant EXECUTE on specific utility functions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated, service_role;

-- 3. Update custom_access_token_hook to safely handle nested app_metadata claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Consultar tenant_id y role del usuario en la tabla public.users
  SELECT tenant_id, role INTO user_tenant_id, user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Garantizar que el objeto app_metadata exista dentro de claims
  IF NOT (claims ? 'app_metadata') OR jsonb_typeof(claims->'app_metadata') <> 'object' THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  END IF;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text), true);
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(user_tenant_id::text), true);
  END IF;

  IF user_role IS NOT NULL THEN
    -- Inyectar rol de aplicación dentro de app_metadata.role (sin sobrescribir claims.role de Postgres)
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role), true);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- 4. Explicit Grants for GoTrue Auth Hook Daemon (supabase_auth_admin)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;

-- 5. Explicit Table Grants for service_role (Full DML Access)
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

-- 6. Strict Minimal Table Grants for authenticated Role (Governed strictly by RLS)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.solicitudes_analisis TO authenticated;
GRANT SELECT, INSERT ON public.informes TO authenticated;
GRANT SELECT, INSERT ON public.mediciones TO authenticated;
GRANT SELECT, INSERT ON public.consumo TO authenticated;
GRANT SELECT, INSERT ON public.workflow_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_settings TO authenticated;
GRANT SELECT, INSERT ON public.api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.observation_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.observaciones_serie TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escenas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.informe_escenas TO authenticated;
GRANT SELECT, INSERT ON public.alertas TO authenticated;

-- Catalog & Billing Tables for authenticated: Read-Only (SELECT ONLY)
GRANT SELECT ON public.suscripciones TO authenticated;
GRANT SELECT ON public.planes TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.suscripciones FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.planes FROM authenticated;

-- 6a. Explicit Grants for audit_logs for authenticated:
GRANT SELECT ON public.audit_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;

-- 7. Explicit ZERO Table Privileges for anon Role (Zero Trust)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 8. Ensure Default Privileges for any future tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
