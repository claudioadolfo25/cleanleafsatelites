-- Migration 005: Real persistence for tenants and hashed API keys
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'piloto',
  estado TEXT NOT NULL DEFAULT 'trial',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  USING (
    id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
  );


CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_select_admin" ON public.api_keys;
CREATE POLICY "api_keys_select_admin" ON public.api_keys
  FOR SELECT
  USING (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'super_admin')
  );

DROP POLICY IF EXISTS "api_keys_insert_admin" ON public.api_keys;
CREATE POLICY "api_keys_insert_admin" ON public.api_keys
  FOR INSERT
  WITH CHECK (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'super_admin')
  );
