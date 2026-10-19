-- Migration 010: Add tenant_id to observation_cache and escenas, and restrict RLS policies

-- a. ALTER TABLE observation_cache
ALTER TABLE public.observation_cache ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- b. ALTER TABLE escenas
ALTER TABLE public.escenas ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- c. DROP POLICY IF EXISTS of the 5 problematic policies
DROP POLICY IF EXISTS "observation_cache_select_all" ON public.observation_cache;
DROP POLICY IF EXISTS "observation_cache_insert_all" ON public.observation_cache;
DROP POLICY IF EXISTS "escenas_select_all" ON public.escenas;
DROP POLICY IF EXISTS "escenas_insert_all" ON public.escenas;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;

-- d & e. Recreate policies for observation_cache
DROP POLICY IF EXISTS "observation_cache_select_tenant" ON public.observation_cache;
CREATE POLICY "observation_cache_select_tenant" ON public.observation_cache
  FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "observation_cache_insert_tenant" ON public.observation_cache;
CREATE POLICY "observation_cache_insert_tenant" ON public.observation_cache
  FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "observation_cache_update_tenant" ON public.observation_cache;
CREATE POLICY "observation_cache_update_tenant" ON public.observation_cache
  FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "observation_cache_delete_tenant" ON public.observation_cache;
CREATE POLICY "observation_cache_delete_tenant" ON public.observation_cache
  FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

-- d & e. Recreate policies for escenas
DROP POLICY IF EXISTS "escenas_select_tenant" ON public.escenas;
CREATE POLICY "escenas_select_tenant" ON public.escenas
  FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "escenas_insert_tenant" ON public.escenas;
CREATE POLICY "escenas_insert_tenant" ON public.escenas
  FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "escenas_update_tenant" ON public.escenas;
CREATE POLICY "escenas_update_tenant" ON public.escenas
  FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS "escenas_delete_tenant" ON public.escenas;
CREATE POLICY "escenas_delete_tenant" ON public.escenas
  FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')::uuid);

-- f. Recreate audit_logs_insert_authenticated policy without OR true
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
