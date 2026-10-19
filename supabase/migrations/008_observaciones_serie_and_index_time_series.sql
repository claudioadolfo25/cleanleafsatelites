-- Migration 008: Observations Series and Index Time Series
CREATE TABLE IF NOT EXISTS public.observaciones_serie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  predio_id UUID NOT NULL REFERENCES public.predios(id) ON DELETE CASCADE,
  satelite TEXT NOT NULL,
  variable TEXT NOT NULL,
  intervalo_desde TIMESTAMPTZ NOT NULL,
  intervalo_hasta TIMESTAMPTZ NOT NULL,
  valor FLOAT,
  porcentaje_pixeles_validos FLOAT DEFAULT 1.0,
  nivel_confianza TEXT DEFAULT 'alta',
  evalscript_version TEXT DEFAULT 'v1.0.0',
  evalscript_hash TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_observaciones_serie UNIQUE (tenant_id, predio_id, satelite, variable, intervalo_desde, intervalo_hasta)
);

ALTER TABLE public.observaciones_serie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "observaciones_serie_select_tenant" ON public.observaciones_serie;
CREATE POLICY "observaciones_serie_select_tenant" ON public.observaciones_serie
  FOR SELECT
  USING (
    tenant_id = coalesce((nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id'), (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id'))::uuid
  );

DROP POLICY IF EXISTS "observaciones_serie_insert_tenant" ON public.observaciones_serie;
CREATE POLICY "observaciones_serie_insert_tenant" ON public.observaciones_serie
  FOR INSERT
  WITH CHECK (
    tenant_id = coalesce((nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id'), (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id'))::uuid
  );
