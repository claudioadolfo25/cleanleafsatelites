-- AgroPulso / Cleanleaf Supabase Migration: 20260924000003_auth_hooks.sql
-- SECURITY DEFINER functions and Custom Access Token Hook for JWT claims app_metadata.

-- Ensure supabase_auth_admin role exists or create mock for local test runs
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin;
  end if;
end $$;

-- Function: has_role
create or replace function has_role(p_user_id uuid, p_role text) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = p_user_id and role = p_role
  );
$$;

-- Custom Access Token Hook function
create or replace function custom_access_token_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  claims jsonb;
  v_user_id uuid;
  v_tenant_id uuid;
  v_role text;
begin
  v_user_id := (event->>'user_id')::uuid;

  select tenant_id, role into v_tenant_id, v_role
  from user_roles
  where user_id = v_user_id
  limit 1;

  claims := event->'claims';

  if v_tenant_id is not null then
    claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(v_tenant_id::text));
  end if;

  if v_role is not null then
    claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(v_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant execution permissions strictly to supabase_auth_admin
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function custom_access_token_hook(jsonb) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke execute on function custom_access_token_hook(jsonb) from authenticated';
  end if;
end $$;

revoke execute on function custom_access_token_hook(jsonb) from public;
grant execute on function custom_access_token_hook(jsonb) to supabase_auth_admin;
