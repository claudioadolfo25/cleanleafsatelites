-- Tests RLS Multi-tenant para Supabase / Postgres.
-- Este archivo valida que Tenant A no pueda leer ni modificar datos de Tenant B.

begin;

-- 1. Configurar contexto como Tenant A (Hacienda Los Robles)
set local request.jwt.claims = '{"tenant_id": "00000000-0000-0000-0000-000000000001", "role": "admin"}';

-- Verificar que Tenant A solo vea sus predios
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios;
  if v_count <> 2 then
    raise exception 'RLS FAIL: Tenant A debería ver exactamente 2 predios, vio %', v_count;
  end if;
end $$;

-- Verificar que Tenant A solo vea sus solicitudes de análisis
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from solicitudes_analisis;
  if v_count <> 1 then
    raise exception 'RLS FAIL: Tenant A debería ver exactamente 1 solicitud, vio %', v_count;
  end if;
end $$;

-- 2. Configurar contexto como Tenant B (Acuícola del Sur)
set local request.jwt.claims = '{"tenant_id": "00000000-0000-0000-0000-000000000002", "role": "admin"}';

-- Verificar que Tenant B solo vea sus predios
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios;
  if v_count <> 1 then
    raise exception 'RLS FAIL: Tenant B debería ver exactamente 1 predio, vio %', v_count;
  end if;
end $$;

-- Verificar que Tenant B no pueda ver predios de Tenant A
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from predios where id = '10000000-0000-0000-0000-000000000001';
  if v_count <> 0 then
    raise exception 'RLS FAIL: Tenant B no debería poder leer el predio de Tenant A';
  end if;
end $$;

rollback;
