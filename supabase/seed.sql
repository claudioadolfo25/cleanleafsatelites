-- Deterministic reference seed for local Supabase tests.
insert into tenants (id, nombre, vertical) values
  ('00000000-0000-0000-0000-000000000001', 'Cliente A · Agricultura', 'agricultura'),
  ('00000000-0000-0000-0000-000000000002', 'Cliente B · Agricultura', 'agricultura')
on conflict (id) do nothing;

insert into predios (id, tenant_id, nombre, comuna, superficie_ha) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Las Quinas', 'Freire', 42),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'El Aromo', 'Pitrufquén', 31),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Predio Cliente B', 'Gorbea', 18)
on conflict (id) do nothing;

insert into mediciones (tenant_id, predio_id, satelite, variable, valor, unidad, fecha_adquisicion) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'sentinel-2', 'ndvi', 0.68, 'ratio', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'sentinel-2', 'ndvi', 0.51, 'ratio', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'sentinel-1', 'sigma0_vv', -18.0, 'dB', now() - interval '1 day')
on conflict do nothing;

-- This request is intentionally invalid and is used by the API test suite:
insert into solicitudes_analisis (tenant_id, predio_id, tier, satelites_solicitados, estado)
values ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'tier1_predio', array['sentinel-3'], 'rechazada_catalogo')
on conflict do nothing;
