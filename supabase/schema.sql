-- Cleanleaf MVP v7/v8 reference schema for Supabase/Postgres.
-- Fully idempotent migration file with JWT claims fallbacks and tenant isolation.
create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  vertical text not null default 'agricultura' check (vertical in ('agricultura', 'acuicultura', 'forestal')),
  creado_en timestamptz not null default now()
);

create table if not exists planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  max_predios integer not null,
  max_ha_mes numeric not null,
  permite_tier3_regional boolean not null default false,
  precio_mensual numeric,
  creado_en timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('super_admin', 'plataforma_admin', 'owner', 'admin', 'admin_tenant', 'agronomo', 'agricultor', 'viewer')),
  email text not null,
  creado_en timestamptz not null default now()
);

-- Idempotently ensure the updated check constraint exists on pre-existing users tables
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_name = 'users'
  ) then
    alter table users drop constraint if exists users_role_check;
    alter table users add constraint users_role_check check (role in ('super_admin', 'plataforma_admin', 'owner', 'admin', 'admin_tenant', 'agronomo', 'agricultor', 'viewer'));
  end if;
exception
  when others then null;
end $$;

create table if not exists predios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  geometria jsonb not null default '{}'::jsonb,
  cultivo_o_uso text,
  comuna text,
  superficie_ha numeric not null check (superficie_ha >= 0.5),
  creado_en timestamptz not null default now()
);

create table if not exists suscripciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_id uuid not null references planes(id),
  estado text not null default 'trial' check (estado in ('trial', 'activa', 'pausada', 'cancelada')),
  precio_mensual numeric,
  proxima_facturacion date,
  stripe_subscription_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists solicitudes_analisis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid references predios(id) on delete set null,
  geometria jsonb not null default '{}'::jsonb,
  superficie_ha numeric not null check (superficie_ha >= 0.5),
  tier text not null check (tier in ('tier1_predio', 'tier2_extendido', 'tier3_regional')),
  satelites_solicitados text[] not null default array['sentinel-2'],
  estado text not null default 'pendiente' check (estado in ('borrador', 'pendiente', 'en_cola', 'procesando', 'completado', 'error_reintentable', 'error_final', 'requiere_revision', 'cancelado', 'rechazada_catalogo', 'rechazada_plan')),
  motor_usado text check (motor_usado in ('processing_api', 'statistical_api', 'batch_api')),
  variables_solicitadas text[] not null default array['ndvi'],
  correlation_id text not null default gen_random_uuid()::text,
  idempotency_key text not null,
  resultado_informe_id uuid,
  mensaje_error text,
  solicitado_por uuid references users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists informes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid references predios(id) on delete set null,
  solicitud_id uuid references solicitudes_analisis(id) on delete set null,
  fecha_generacion timestamptz not null default now(),
  tipo_lente text not null default 'agro',
  contenido jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'solicitudes_resultado_informe_fk'
  ) then
    alter table solicitudes_analisis
      add constraint solicitudes_resultado_informe_fk
      foreign key (resultado_informe_id) references informes(id) on delete set null;
  end if;
end $$;

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

create table if not exists consumo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  fecha date not null default current_date,
  ha_procesadas numeric not null default 0,
  unidades_procesamiento_usadas numeric not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid references predios(id) on delete set null,
  tipo_alerta text not null,
  valor_umbral numeric,
  valor_real numeric,
  fecha_activacion timestamptz not null default now(),
  enviada boolean not null default false,
  creado_en timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  hash_key text not null unique,
  activa boolean not null default true,
  creado_por uuid references users(id),
  ultima_uso timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists workflow_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  workflow_nombre text not null,
  estado text not null check (estado in ('exitoso', 'fallido')),
  mensaje_error text,
  payload jsonb,
  inicio_ejecucion timestamptz default now(),
  fin_ejecucion timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists weather_cache (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  latitude numeric not null,
  longitude numeric not null,
  forecast_json jsonb not null,
  creado_en timestamptz not null default now()
);

create table if not exists soil_samples (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid references predios(id) on delete cascade,
  sample_date date not null,
  ph numeric,
  nitrogen_ppm numeric,
  phosphorus_ppm numeric,
  potassium_ppm numeric,
  creado_en timestamptz not null default now()
);

-- JWT claims are used here to avoid recursive reads from users during RLS evaluation.
-- The Supabase auth hook sets tenant_id and role claims after login.
create or replace function get_current_tenant_id() returns uuid
language sql security definer stable set search_path = public as $$
  select coalesce(
    nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id', ''),
    nullif(nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id', ''),
    nullif(current_setting('app.current_tenant_id', true), '')
  )::uuid;
$$;

create or replace function get_current_role() returns text
language sql security definer stable set search_path = public as $$
  select coalesce(
    nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', ''),
    nullif(nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role', '')
  );
$$;

alter table tenants enable row level security;
alter table planes enable row level security;
alter table users enable row level security;
alter table predios enable row level security;
alter table suscripciones enable row level security;
alter table solicitudes_analisis enable row level security;
alter table informes enable row level security;
alter table mediciones enable row level security;
alter table consumo enable row level security;
alter table alertas enable row level security;
alter table api_keys enable row level security;
alter table workflow_logs enable row level security;
alter table weather_cache enable row level security;
alter table soil_samples enable row level security;

-- Drop existing policies for idempotent re-execution
drop policy if exists tenants_isolation on tenants;
drop policy if exists planes_read on planes;
drop policy if exists users_isolation on users;
drop policy if exists users_update_role_guard on users;
drop policy if exists predios_isolation on predios;
drop policy if exists suscripciones_isolation on suscripciones;
drop policy if exists solicitudes_isolation on solicitudes_analisis;
drop policy if exists informes_isolation on informes;
drop policy if exists mediciones_isolation on mediciones;
drop policy if exists consumo_isolation on consumo;
drop policy if exists alertas_isolation on alertas;
drop policy if exists api_keys_isolation on api_keys;
drop policy if exists workflow_logs_isolation on workflow_logs;
drop policy if exists weather_cache_isolation on weather_cache;
drop policy if exists soil_samples_isolation on soil_samples;

create policy tenants_isolation on tenants for all using (id = get_current_tenant_id() or get_current_role() in ('super_admin', 'plataforma_admin'));
create policy planes_read on planes for select using (true);
create policy users_isolation on users for select using (tenant_id = get_current_tenant_id() or get_current_role() in ('super_admin', 'plataforma_admin'));

-- Strict WITH CHECK guard: Non-admin users cannot alter their role column
create policy users_update_role_guard on users for update
  using (tenant_id = get_current_tenant_id() or get_current_role() in ('super_admin', 'plataforma_admin'))
  with check (
    (get_current_role() in ('owner', 'admin', 'admin_tenant', 'super_admin', 'plataforma_admin'))
    or (role = get_current_role())
  );

create policy predios_isolation on predios for all using (tenant_id = get_current_tenant_id());
create policy suscripciones_isolation on suscripciones for all using (tenant_id = get_current_tenant_id());
create policy solicitudes_isolation on solicitudes_analisis for all using (tenant_id = get_current_tenant_id());
create policy informes_isolation on informes for all using (tenant_id = get_current_tenant_id());
create policy mediciones_isolation on mediciones for all using (tenant_id = get_current_tenant_id());
create policy consumo_isolation on consumo for all using (tenant_id = get_current_tenant_id());
create policy alertas_isolation on alertas for all using (tenant_id = get_current_tenant_id());
create policy api_keys_isolation on api_keys for all using (tenant_id = get_current_tenant_id() and get_current_role() in ('owner', 'admin', 'admin_tenant', 'super_admin', 'plataforma_admin'));
create policy workflow_logs_isolation on workflow_logs for all using (tenant_id = get_current_tenant_id() and get_current_role() in ('owner', 'admin', 'admin_tenant', 'super_admin', 'plataforma_admin'));
create policy weather_cache_isolation on weather_cache for all using (tenant_id = get_current_tenant_id());
create policy soil_samples_isolation on soil_samples for all using (tenant_id = get_current_tenant_id());

create index if not exists idx_predios_tenant on predios(tenant_id);
create index if not exists idx_mediciones_predio_fecha on mediciones(predio_id, fecha_adquisicion desc);
create index if not exists idx_mediciones_satelite_variable on mediciones(satelite, variable);
create index if not exists idx_solicitudes_tenant_estado on solicitudes_analisis(tenant_id, estado);
create unique index if not exists uq_solicitudes_tenant_idempotency on solicitudes_analisis(tenant_id, idempotency_key);
create index if not exists idx_api_keys_tenant_active on api_keys(tenant_id, activa);
create unique index if not exists uq_mediciones_request_source_variable_date on mediciones(tenant_id, predio_id, solicitud_id, satelite, variable, fecha_adquisicion);
