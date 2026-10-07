-- AgroPulso / Cleanleaf Supabase Migration: 20260924000002_domain_extensions.sql
-- Add user_roles, invitaciones, audit_log, eventos_pago, ciclos_campana, bitacora_labores, leads and extend suscripciones/alertas.

-- 1. Table: user_roles
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null check (role in ('owner', 'admin_tenant', 'agronomo', 'agricultor', 'plataforma_admin')),
  creado_en timestamptz not null default now(),
  constraint uq_user_tenant_role unique (user_id, tenant_id, role)
);

-- 2. Table: invitaciones
create table if not exists invitaciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin_tenant', 'agronomo', 'agricultor')),
  token text not null unique,
  expira_at timestamptz not null,
  usada boolean not null default false,
  creado_por uuid references users(id),
  creado_en timestamptz not null default now()
);

-- 3. Table: audit_log (INSERT-only)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  usuario_id uuid references users(id) on delete set null,
  accion text not null,
  tabla text not null,
  registro_id text,
  payload jsonb default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

-- 4. Table: eventos_pago
create table if not exists eventos_pago (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_id text not null unique,
  proveedor text not null check (proveedor in ('stripe', 'mercado_pago')),
  tipo_evento text not null,
  payload jsonb default '{}'::jsonb,
  procesado boolean not null default false,
  creado_en timestamptz not null default now()
);

-- 5. Table: ciclos_campana
create table if not exists ciclos_campana (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid not null references predios(id) on delete cascade,
  nombre text not null,
  cultivo text not null default 'maiz',
  fase_actual integer not null default 0 check (fase_actual >= 0 and fase_actual <= 5),
  fecha_inicio date not null,
  fecha_estimada_cosecha date,
  creado_en timestamptz not null default now()
);

-- 6. Table: bitacora_labores
create table if not exists bitacora_labores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  predio_id uuid not null references predios(id) on delete cascade,
  ciclo_id uuid references ciclos_campana(id) on delete set null,
  tipo_labor text not null,
  descripcion text,
  fecha_realizacion date not null default current_date,
  registrado_por uuid references users(id),
  creado_en timestamptz not null default now()
);

-- 7. Table: leads (Anonymous INSERT, no public SELECT)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  empresa text,
  mensaje text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'convertido', 'descartado')),
  creado_en timestamptz not null default now()
);

-- Extend suscripciones to include viva/grace period states
alter table suscripciones
  add column if not exists proveedor text check (proveedor in ('stripe', 'mercado_pago')),
  add column if not exists external_id text,
  add column if not exists proxima_renovacion timestamptz;

alter table suscripciones drop constraint if exists suscripciones_estado_check;
alter table suscripciones add constraint suscripciones_estado_check check (estado in ('trial', 'activa', 'en_gracia', 'cancelada', 'impaga', 'pausada'));

-- Extend alertas
alter table alertas
  add column if not exists explicacion text,
  add column if not exists nivel_confianza text check (nivel_confianza in ('alto', 'medio', 'bajo', 'no_concluyente'));

-- Enable RLS
alter table user_roles enable row level security;
alter table invitaciones enable row level security;
alter table audit_log enable row level security;
alter table eventos_pago enable row level security;
alter table ciclos_campana enable row level security;
alter table bitacora_labores enable row level security;
alter table leads enable row level security;

-- Policies for user_roles
create policy user_roles_isolation on user_roles for select using (
  tenant_id = get_current_tenant_id() or get_current_role() = 'super_admin' or role = 'plataforma_admin'
);

-- Policies for invitaciones
create policy invitaciones_isolation on invitaciones for all using (tenant_id = get_current_tenant_id());

-- Policies for audit_log: INSERT allowed for tenant, SELECT for admin, NO UPDATE OR DELETE policies
create policy audit_log_insert on audit_log for insert with check (tenant_id = get_current_tenant_id() or get_current_role() = 'super_admin');
create policy audit_log_select on audit_log for select using (tenant_id = get_current_tenant_id() and get_current_role() in ('admin', 'super_admin'));

-- Revoke UPDATE/DELETE explicitly on audit_log if roles exist
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke update, delete on audit_log from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke update, delete on audit_log from authenticated';
  end if;
end $$;

-- Policies for eventos_pago
create policy eventos_pago_isolation on eventos_pago for all using (tenant_id = get_current_tenant_id() and get_current_role() in ('admin', 'super_admin'));

-- Policies for ciclos_campana and bitacora_labores
create policy ciclos_campana_isolation on ciclos_campana for all using (tenant_id = get_current_tenant_id());
create policy bitacora_labores_isolation on bitacora_labores for all using (tenant_id = get_current_tenant_id());

-- Policies for leads: Anonymous INSERT allowed, NO public SELECT policy
create policy leads_anonymous_insert on leads for insert with check (true);
