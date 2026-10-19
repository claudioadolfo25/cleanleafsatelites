-- Migration 004: User preferences and tenant satellite settings with RLS
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  sector TEXT NOT NULL DEFAULT 'agricultura',
  necesidad TEXT NOT NULL DEFAULT 'monitoreo_general',
  fuentes_activas JSONB NOT NULL DEFAULT '["sentinel-2"]'::jsonb,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own" ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
CREATE POLICY "user_preferences_update_own" ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  sector TEXT NOT NULL DEFAULT 'agricultura',
  necesidad TEXT NOT NULL DEFAULT 'monitoreo_general',
  fuentes_activas JSONB NOT NULL DEFAULT '["sentinel-2"]'::jsonb,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_select_tenant" ON public.tenant_settings;
CREATE POLICY "tenant_settings_select_tenant" ON public.tenant_settings
  FOR SELECT
  USING (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
  );

DROP POLICY IF EXISTS "tenant_settings_insert_admin" ON public.tenant_settings;
CREATE POLICY "tenant_settings_insert_admin" ON public.tenant_settings
  FOR INSERT
  WITH CHECK (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'super_admin')
  );

DROP POLICY IF EXISTS "tenant_settings_update_admin" ON public.tenant_settings;
CREATE POLICY "tenant_settings_update_admin" ON public.tenant_settings
  FOR UPDATE
  USING (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'super_admin')
  );
