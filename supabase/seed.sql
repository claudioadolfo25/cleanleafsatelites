-- Cleanleaf v7 deterministic reference seed for Supabase isolation tests.
insert into planes (id, nombre, max_predios, max_ha_mes, permite_tier3_regional, precio_mensual) values
  ('20000000-0000-0000-0000-000000000001', 'piloto', 5, 50, false, 0),
  ('20000000-0000-0000-0000-000000000002', 'regional_pyme', 50, 5000, false, 0),
  ('20000000-0000-0000-0000-000000000003', 'region_completa', 1000, 999999999, true, 0)
on conflict (id) do nothing;

insert into tenants (id, nombre, vertical) values
  ('00000000-0000-0000-0000-000000000001', 'Cliente A · Agricultura', 'agricultura'),
  ('00000000-0000-0000-0000-000000000002', 'Cliente B · Agricultura', 'agricultura'),
  ('00000000-0000-0000-0000-000000000099', 'Cleanleaf Ops', 'agricultura')
on conflict (id) do nothing;

insert into users (id, tenant_id, role, email) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin', 'admin-a@cleanleaf.demo'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'viewer', 'viewer-a@cleanleaf.demo'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'admin', 'admin-b@cleanleaf.demo'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'viewer', 'viewer-b@cleanleaf.demo'),
  ('30000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000099', 'super_admin', 'ops@cleanleaf.demo')
on conflict (id) do nothing;

insert into predios (id, tenant_id, nombre, comuna, superficie_ha, geometria, cultivo_o_uso) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Las Quinas', 'Freire', 0.5, '{"type":"Polygon","coordinates":[]}', 'Cerezos'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'El Aromo', 'Pitrufquén', 12, '{"type":"Polygon","coordinates":[]}', 'Arándanos'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Santa Elena', 'Gorbea', 8, '{"type":"Polygon","coordinates":[]}', 'Trigo'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Predio B Norte', 'Gorbea', 0.5, '{"type":"Polygon","coordinates":[]}', 'Cerezos'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Predio B Centro', 'Loncoche', 12, '{"type":"Polygon","coordinates":[]}', 'Pino'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Predio B Sur', 'Villarrica', 8, '{"type":"Polygon","coordinates":[]}', 'Avena')
on conflict (id) do nothing;

insert into suscripciones (tenant_id, plan_id, estado) values
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'trial'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'trial')
on conflict do nothing;

insert into solicitudes_analisis (id, tenant_id, predio_id, superficie_ha, tier, satelites_solicitados, variables_solicitadas, estado, motor_usado, solicitado_por, idempotency_key) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 0.5, 'tier1_predio', array['sentinel-2'], array['ndvi'], 'completado', 'processing_api', '30000000-0000-0000-0000-000000000001', 'seed-a-tier1'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 800, 'tier2_extendido', array['sentinel-2','sentinel-1'], array['ndvi','sigma0_vv'], 'procesando', 'statistical_api', '30000000-0000-0000-0000-000000000001', 'seed-a-tier2'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 6000, 'tier3_regional', array['sentinel-2'], array['ndvi'], 'requiere_revision', 'batch_api', '30000000-0000-0000-0000-000000000003', 'seed-b-tier3')
on conflict (id) do nothing;

insert into mediciones (tenant_id, predio_id, satelite, variable, valor, unidad, fecha_adquisicion)
select '00000000-0000-0000-0000-000000000001', predio_id, 'sentinel-2', 'ndvi', value, 'ratio', now() - (row_number() over (partition by predio_id order by value) * interval '5 days')
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 0.3::numeric), ('10000000-0000-0000-0000-000000000001'::uuid, 0.4), ('10000000-0000-0000-0000-000000000001'::uuid, 0.5), ('10000000-0000-0000-0000-000000000001'::uuid, 0.6), ('10000000-0000-0000-0000-000000000001'::uuid, 0.7),
  ('10000000-0000-0000-0000-000000000002'::uuid, 0.3), ('10000000-0000-0000-0000-000000000002'::uuid, 0.4), ('10000000-0000-0000-0000-000000000002'::uuid, 0.5), ('10000000-0000-0000-0000-000000000002'::uuid, 0.6), ('10000000-0000-0000-0000-000000000002'::uuid, 0.7),
  ('10000000-0000-0000-0000-000000000003'::uuid, 0.3), ('10000000-0000-0000-0000-000000000003'::uuid, 0.4), ('10000000-0000-0000-0000-000000000003'::uuid, 0.5), ('10000000-0000-0000-0000-000000000003'::uuid, 0.6), ('10000000-0000-0000-0000-000000000003'::uuid, 0.7)
) as values_table(predio_id, value)
on conflict do nothing;

insert into informes (tenant_id, predio_id, solicitud_id, tipo_lente, contenido)
select tenant_id, predio_id, id, 'agro', '{"resumen":"Informe de prueba Cleanleaf","fuente":"sentinel-2"}'::jsonb
from solicitudes_analisis where estado = 'completado'
on conflict do nothing;

insert into alertas (tenant_id, predio_id, tipo_alerta, valor_umbral, valor_real)
values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'ndvi_bajo', 0.3, 0.28)
on conflict do nothing;

insert into workflow_logs (tenant_id, workflow_nombre, estado, payload)
values ('00000000-0000-0000-0000-000000000001', 'sentinel-on-demand', 'exitoso', '{"tier":"tier2_extendido"}'::jsonb)
on conflict do nothing;
