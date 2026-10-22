-- Supabase Migration: 003_auth_hook_and_idempotency.sql
-- Inyecta tenant_id y role en los claims de JWT via Auth Hook y asegura la constraint única de idempotencia.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_tenant_id uuid;
  user_role text;
begin
  -- Consultar tenant_id y role del usuario en la tabla public.users
  select tenant_id, role into user_tenant_id, user_role
  from public.users
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_tenant_id is not null then
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(user_tenant_id::text));
  end if;

  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Garantizar constraint e índice único de idempotencia aislados por tenant
create unique index if not exists uq_solicitudes_tenant_idempotency on public.solicitudes_analisis(tenant_id, idempotency_key);
