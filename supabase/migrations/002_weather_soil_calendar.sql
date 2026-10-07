# Migration 002: Agroclimatic weather cache and soil sample calibration
CREATE TABLE IF NOT EXISTS public.weather_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    predio_id TEXT NOT NULL,
    date DATE NOT NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT weather_cache_predio_date_unique UNIQUE (tenant_id, predio_id, date)
);

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY weather_cache_tenant_isolation ON public.weather_cache
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE TABLE IF NOT EXISTS public.soil_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    predio_id TEXT NOT NULL,
    sample_date DATE NOT NULL,
    lat NUMERIC(10, 7) NOT NULL,
    lon NUMERIC(10, 7) NOT NULL,
    soc_pct NUMERIC(5, 2),
    ph NUMERIC(4, 2),
    n_ppm NUMERIC(7, 2),
    p_ppm NUMERIC(7, 2),
    k_ppm NUMERIC(7, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT soil_samples_tenant_predio_date UNIQUE (tenant_id, predio_id, sample_date, lat, lon)
);

ALTER TABLE public.soil_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY soil_samples_tenant_isolation ON public.soil_samples
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Add crop calendar fields to predios table if existing or metadata json
ALTER TABLE public.predios ADD COLUMN IF NOT EXISTS cultivo TEXT;
ALTER TABLE public.predios ADD COLUMN IF NOT EXISTS fecha_siembra DATE;
ALTER TABLE public.predios ADD COLUMN IF NOT EXISTS zona_agricola TEXT;
