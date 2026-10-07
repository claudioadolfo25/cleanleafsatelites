-- AgroPulso / Cleanleaf Comprehensive Multi-tenant RLS Isolation Test Suite
-- Executes multi-tenant isolation assertions across all business tables.

-- 1. Setup Mock Tenants
insert into tenants (id, nombre, vertical)
values
  ('11111111-1111-1111-1111-111111111111', 'Agrofinca A', 'agricultura'),
  ('22222222-2222-2222-2222-222222222222', 'Cooperativa B', 'agricultura')
on conflict (id) do nothing;

-- 2. Setup Mock Users
insert into users (id, tenant_id, role, email)
values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin', 'admin@fincaa.com'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'admin', 'admin@coopb.com')
on conflict (id) do nothing;

-- 3. Setup Mock Predios
insert into predios (id, tenant_id, nombre, superficie_ha)
values
  ('a1111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'Lote Maiz A1', 25.5),
  ('b2222222-3333-4444-5555-666666666666', '22222222-2222-2222-2222-222222222222', 'Lote Maiz B1', 40.0)
on conflict (id) do nothing;

-- Switch to authenticated non-superuser role to enforce RLS evaluation
set local role authenticated;

-- Test 1: Set session claims for Tenant A via app_metadata
set local request.jwt.claims = '{"app_metadata": {"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "admin"}}';

-- Verify Tenant A cannot see Tenant B predio
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios;
  if v_count != 1 then
    raise exception 'RLS TEST FAIL: Tenant A expected 1 predio, saw %', v_count;
  end if;
end $$;

-- Test 2: Set session claims for Tenant B via app_metadata
set local request.jwt.claims = '{"app_metadata": {"tenant_id": "22222222-2222-2222-2222-222222222222", "role": "admin"}}';

-- Verify Tenant B cannot see Tenant A predio
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios;
  if v_count != 1 then
    raise exception 'RLS TEST FAIL: Tenant B expected 1 predio, saw %', v_count;
  end if;
end $$;

-- Test 3: Verify user_metadata bypass fails
set local request.jwt.claims = '{"user_metadata": {"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "admin"}}';

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios;
  if v_count != 0 then
    raise exception 'RLS TEST FAIL: user_metadata granted access when app_metadata was expected!';
  end if;
end $$;

-- Test 4: Verify audit_log UPDATE / DELETE blocking
set local request.jwt.claims = '{"app_metadata": {"tenant_id": "22222222-2222-2222-2222-222222222222", "role": "admin"}}';

insert into audit_log (tenant_id, accion, tabla)
values ('22222222-2222-2222-2222-222222222222', 'CREATE', 'predios');

do $$
begin
  begin
    update audit_log set accion = 'TAMPERED';
    raise exception 'RLS TEST FAIL: audit_log UPDATE should have been blocked';
  exception when insufficient_privilege or feature_not_supported then
    -- Expected behavior
    null;
  end;
end $$;

-- Test 5: Verify all public business tables have RLS enabled (excluding extension system tables like spatial_ref_sys)
set local role postgres;

do $$
declare
  v_unprotected_count integer;
begin
  select count(*) into v_unprotected_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false
    and c.relname not in ('spatial_ref_sys');

  if v_unprotected_count > 0 then
    raise exception 'RLS TEST FAIL: Found % public tables without RLS enabled!', v_unprotected_count;
  end if;
end $$;

rollback;
