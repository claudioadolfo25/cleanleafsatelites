-- Migration 009: Copernicus STAC Scenes and Report Provenance Junction
CREATE TABLE IF NOT EXISTS public.escenas (
  id TEXT PRIMARY KEY,
  satelite TEXT NOT NULL,
  producto TEXT NOT NULL,
  fecha_sensado TIMESTAMPTZ NOT NULL,
  cobertura_nubes FLOAT,
  baseline_procesamiento TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.escenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escenas_select_all" ON public.escenas;
CREATE POLICY "escenas_select_all" ON public.escenas
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "escenas_insert_all" ON public.escenas;
CREATE POLICY "escenas_insert_all" ON public.escenas
  FOR INSERT
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.informe_escenas (
  informe_id UUID NOT NULL REFERENCES public.informes(id) ON DELETE CASCADE,
  escena_id TEXT NOT NULL REFERENCES public.escenas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (informe_id, escena_id)
);

ALTER TABLE public.informe_escenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "informe_escenas_select_tenant" ON public.informe_escenas;
CREATE POLICY "informe_escenas_select_tenant" ON public.informe_escenas
  FOR SELECT
  USING (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
  );

DROP POLICY IF EXISTS "informe_escenas_insert_tenant" ON public.informe_escenas;
CREATE POLICY "informe_escenas_insert_tenant" ON public.informe_escenas
  FOR INSERT
  WITH CHECK (
    tenant_id = (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id')::uuid
  );
