-- Cleanleaf MVP reference schema for Supabase/Postgres.
-- The current WebDev runtime uses Drizzle/MySQL; this file is the migration target for Phase 2.
create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  vertical text not null default 'agricultura' check (vertical in ('agricultura', 'acuicultura', 'forestal')),
  creado_en timestamptz not null default now()
);

create table if not exists predios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  comuna text,
  superficie_ha numeric not null check (superficie_ha >= 0.5),
  creado_en timestamptz not null default now()
);

create table if not exists solicitudes_analisis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid not null references predios(id) on delete cascade,
  tier text not null check (tier in ('tier1_predio', 'tier2_extendido', 'tier3_regional')),
  satelites_solicitados text[] not null default array['sentinel-2'],
  estado text not null default 'en_proceso',
  creado_en timestamptz not null default now()
);

create table if not exists mediciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid not null references predios(id) on delete cascade,
  solicitud_id uuid references solicitudes_analisis(id) on delete set null,
  satelite text not null check (satelite in ('sentinel-1', 'sentinel-2', 'sentinel-3')),
  variable text not null,
  valor numeric not null,
  unidad text,
  fecha_adquisicion timestamptz not null,
  creado_en timestamptz not null default now()
);

create table if not exists workflow_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  workflow text not null,
  estado text not null,
  payload jsonb,
  creado_en timestamptz not null default now()
);

create or replace function get_current_tenant_id() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')::uuid;
$$;

alter table tenants enable row level security;
alter table predios enable row level security;
alter table solicitudes_analisis enable row level security;
alter table mediciones enable row level security;
alter table workflow_logs enable row level security;

create policy tenants_tenant_isolation on tenants for all using (id = get_current_tenant_id());
create policy predios_tenant_isolation on predios for all using (tenant_id = get_current_tenant_id());
create policy solicitudes_tenant_isolation on solicitudes_analisis for all using (tenant_id = get_current_tenant_id());
create policy mediciones_tenant_isolation on mediciones for all using (tenant_id = get_current_tenant_id());
create policy workflow_logs_tenant_isolation on workflow_logs for all using (tenant_id = get_current_tenant_id());

create index if not exists idx_mediciones_predio_fecha on mediciones(predio_id, fecha_adquisicion desc);
create index if not exists idx_mediciones_satelite_variable on mediciones(satelite, variable);
