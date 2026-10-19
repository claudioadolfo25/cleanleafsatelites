-- NOTA: Producción ya tiene estas tablas. Esta migración debe marcarse como aplicada con: supabase migration repair --status applied 001_baseline_from_schema. NO ejecutar en producción.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  vertical TEXT NOT NULL DEFAULT 'agricultura' CHECK (vertical IN ('agricultura', 'acuicultura', 'forestal')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  max_predios INTEGER NOT NULL,
  max_ha_mes NUMERIC NOT NULL,
  permite_tier3_regional BOOLEAN NOT NULL DEFAULT FALSE,
  precio_mensual NUMERIC,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
  email TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.predios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  geometria JSONB NOT NULL DEFAULT '{}'::jsonb,
  cultivo_o_uso TEXT,
  comuna TEXT,
  superficie_ha NUMERIC NOT NULL CHECK (superficie_ha >= 0.5),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.planes(id),
  estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial', 'activa', 'pausada', 'cancelada')),
  precio_mensual NUMERIC,
  proxima_facturacion DATE,
  stripe_subscription_id TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solicitudes_analisis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  predio_id UUID REFERENCES public.predios(id) ON DELETE SET NULL,
  geometria JSONB NOT NULL DEFAULT '{}'::jsonb,
  superficie_ha NUMERIC NOT NULL CHECK (superficie_ha >= 0.5),
  tier TEXT NOT NULL CHECK (tier IN ('tier1_predio', 'tier2_extendido', 'tier3_regional')),
  satelites_solicitados TEXT[] NOT NULL DEFAULT ARRAY['sentinel-2'],
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('borrador', 'pendiente', 'en_cola', 'procesando', 'completado', 'error_reintentable', 'error_final', 'requiere_revision', 'cancelado', 'rechazada_catalogo', 'rechazada_plan')),
  motor_usado TEXT CHECK (motor_usado IN ('processing_api', 'statistical_api', 'batch_api')),
  variables_solicitadas TEXT[] NOT NULL DEFAULT ARRAY['ndvi'],
  correlation_id TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  idempotency_key TEXT NOT NULL,
  resultado_informe_id UUID,
  mensaje_error TEXT,
  solicitado_por UUID REFERENCES public.users(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.informes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  predio_id UUID REFERENCES public.predios(id) ON DELETE SET NULL,
  solicitud_id UUID REFERENCES public.solicitudes_analisis(id) ON DELETE SET NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_lente TEXT NOT NULL DEFAULT 'agro',
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solicitudes_resultado_informe_fk'
  ) THEN
    ALTER TABLE public.solicitudes_analisis
      ADD CONSTRAINT solicitudes_resultado_informe_fk
      FOREIGN KEY (resultado_informe_id) REFERENCES public.informes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  predio_id UUID NOT NULL REFERENCES public.predios(id) ON DELETE CASCADE,
  solicitud_id UUID REFERENCES public.solicitudes_analisis(id) ON DELETE SET NULL,
  satelite TEXT NOT NULL CHECK (satelite IN ('sentinel-1', 'sentinel-2', 'sentinel-3')),
  variable TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  unidad TEXT,
  fecha_adquisicion TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  ha_procesadas NUMERIC NOT NULL DEFAULT 0,
  unidades_procesamiento_usadas NUMERIC NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  predio_id UUID REFERENCES public.predios(id) ON DELETE SET NULL,
  tipo_alerta TEXT NOT NULL,
  valor_umbral NUMERIC,
  valor_real NUMERIC,
  fecha_activacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviada BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  hash_key TEXT NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por UUID REFERENCES public.users(id),
  ultima_uso TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_nombre TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('exitoso', 'fallido')),
  mensaje_error TEXT,
  payload JSONB,
  inicio_ejecucion TIMESTAMPTZ DEFAULT NOW(),
  fin_ejecucion TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION get_current_role() RETURNS TEXT
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'role', '');
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_isolation" ON public.tenants;
CREATE POLICY "tenants_isolation" ON public.tenants FOR ALL USING (id = get_current_tenant_id() OR get_current_role() = 'super_admin');

DROP POLICY IF EXISTS "planes_read" ON public.planes;
CREATE POLICY "planes_read" ON public.planes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "users_isolation" ON public.users;
CREATE POLICY "users_isolation" ON public.users FOR ALL USING (tenant_id = get_current_tenant_id() OR get_current_role() = 'super_admin');

DROP POLICY IF EXISTS "predios_isolation" ON public.predios;
CREATE POLICY "predios_isolation" ON public.predios FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "suscripciones_isolation" ON public.suscripciones;
CREATE POLICY "suscripciones_isolation" ON public.suscripciones FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "solicitudes_isolation" ON public.solicitudes_analisis;
CREATE POLICY "solicitudes_isolation" ON public.solicitudes_analisis FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "informes_isolation" ON public.informes;
CREATE POLICY "informes_isolation" ON public.informes FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "mediciones_isolation" ON public.mediciones;
CREATE POLICY "mediciones_isolation" ON public.mediciones FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "consumo_isolation" ON public.consumo;
CREATE POLICY "consumo_isolation" ON public.consumo FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "alertas_isolation" ON public.alertas;
CREATE POLICY "alertas_isolation" ON public.alertas FOR ALL USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "api_keys_isolation" ON public.api_keys;
CREATE POLICY "api_keys_isolation" ON public.api_keys FOR ALL USING (tenant_id = get_current_tenant_id() AND get_current_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "workflow_logs_isolation" ON public.workflow_logs;
CREATE POLICY "workflow_logs_isolation" ON public.workflow_logs FOR ALL USING (tenant_id = get_current_tenant_id() AND get_current_role() IN ('admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_predios_tenant ON public.predios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_predio_fecha ON public.mediciones(predio_id, fecha_adquisicion DESC);
CREATE INDEX IF NOT EXISTS idx_mediciones_satelite_variable ON public.mediciones(satelite, variable);
CREATE INDEX IF NOT EXISTS idx_solicitudes_tenant_estado ON public.solicitudes_analisis(tenant_id, estado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitudes_tenant_idempotency ON public.solicitudes_analisis(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON public.api_keys(tenant_id, activa);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mediciones_request_source_variable_date ON public.mediciones(tenant_id, predio_id, solicitud_id, satelite, variable, fecha_adquisicion);
