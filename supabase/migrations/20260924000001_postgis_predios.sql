-- AgroPulso / Cleanleaf Supabase Migration: 20260924000001_postgis_predios.sql
-- Enable PostGIS extension and convert predios.geometria from jsonb to PostGIS geometry(Polygon, 4326) with GIST index.

create extension if not exists postgis;

-- Add spatial PostGIS geometry column to predios
alter table predios add column if not exists geom geometry(Polygon, 4326);

-- Populate geom from geometria_geojson if valid GeoJSON structure exists
update predios
set geom = ST_SetSRID(ST_GeomFromGeoJSON(geometria::text), 4326)
where geometria is not null and geometria != '{}'::jsonb and geom is null;

-- Spatial GIST Index on predios geometry
create index if not exists idx_predios_geom_gist on predios using gist(geom);

-- Helper function to calculate area in hectares from PostGIS geometry
create or replace function calcular_superficie_ha(p_geom geometry) returns numeric
language sql immutable strict as $$
  select round((ST_Area(p_geom::geography) / 10000.0)::numeric, 2);
$$;
