-- Migration 007: Observation Cache and Quality Metrics
CREATE TABLE IF NOT EXISTS public.observation_cache (
  cache_key TEXT PRIMARY KEY,
  bbox JSONB,
  periodo_desde TIMESTAMPTZ,
  periodo_hasta TIMESTAMPTZ,
  satelite TEXT NOT NULL,
  variable TEXT NOT NULL,
  datos JSONB NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.observation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "observation_cache_select_all" ON public.observation_cache;
CREATE POLICY "observation_cache_select_all" ON public.observation_cache
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "observation_cache_insert_all" ON public.observation_cache;
CREATE POLICY "observation_cache_insert_all" ON public.observation_cache
  FOR INSERT
  WITH CHECK (true);

-- Add quality metrics columns to mediciones table if not present
ALTER TABLE public.mediciones
  ADD COLUMN IF NOT EXISTS porcentaje_pixeles_validos FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS nivel_confianza TEXT DEFAULT 'alta';
