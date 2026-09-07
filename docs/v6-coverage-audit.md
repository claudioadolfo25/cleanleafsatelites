# Auditoría de cobertura de Cleanleaf frente a la propuesta v6

**Fecha:** septiembre de 2026  
**Estado evaluado:** MVP Cleanleaf en checkpoint `d35c9322`  
**Conclusión:** la propuesta v6 **no está implementada en su totalidad**. El núcleo de selección satelital y el endurecimiento fail-safe están cubiertos. La arquitectura de producción exigida por v6, basada en Supabase, RLS operativo, Dify, n8n, datos seed completos y pruebas SQL de aislamiento, permanece parcial o pendiente.

## 1. Decisión ejecutiva

El MVP actual es un prototipo SaaS funcional sobre la plantilla WebDev de Manus, con React, tRPC, Drizzle/MySQL, autenticación Manus y datos demostrativos. La propuesta v6 describe otra arquitectura objetivo: Next.js 14 con App Router, Supabase Auth, Supabase Postgres, API routes, Dify y n8n.

Por lo tanto, no es correcto afirmar que v6 fue implementada completamente. Sí es correcto afirmar que se implementaron y endurecieron los elementos satelitales que luego fueron reforzados en v7/v8: catálogo por vertical, selección Sentinel-1/Sentinel-2/Sentinel-3, contrato común de mediciones, motor de tiers, interpretación por fuente y rechazo de fuentes incompatibles.

La decisión recomendada es **mantener la arquitectura actual como shell de MVP** y tratar los artefactos Supabase como una migración objetivo. No conviene cambiar de stack de forma implícita porque v6 y v8 no son equivalentes y una migración silenciosa aumentaría el riesgo operativo.

## 2. Matriz de cobertura

| Área de v6 | Estado | Evidencia o brecha |
| --- | --- | --- |
| Vertical agricultura y piloto La Araucanía | Cubierto | Dashboard, predios demostrativos y copy del producto están orientados a agricultura en La Araucanía. |
| Sentinel-1, Sentinel-2 y Sentinel-3 | Cubierto | `shared/satellite-catalog.ts` y `shared/satellite-service.ts`. |
| Sentinel-4, Sentinel-5P y Sentinel-6 excluidos | Cubierto | No aparecen en el código activo como opciones habilitables. Verificación automatizada con `rg`. |
| Catálogo único por vertical | Cubierto y reforzado | La allowlist de política no puede ser ampliada por entorno. Los valores desconocidos o incompatibles se ignoran. |
| Fail-safe de configuración | Cubierto y reforzado | `getSatelliteConfigurationStatus()` devuelve configuración efectiva y advertencias. La UI muestra la advertencia al operador. |
| Tiers de superficie | Cubierto | Tier 1 menor a 50 ha, Tier 2 de 50 a 499 ha y Tier 3 desde 500 ha como stub regional. |
| Stubs Sentinel con contrato común | Cubierto | `querySentinel1/2/3` son asíncronas y devuelven `satelite`, `variable`, `valor`, `unidad` y `fecha_adquisicion` como `Date`. |
| Selector de satélite | Cubierto | `SatelliteSelector.tsx` solo muestra el catálogo de la vertical. Sentinel-2 queda principal en agricultura. |
| Gráfico de variables multi-satélite | Parcial | Existe `VariableChart.tsx` y el dashboard demuestra alternancia Sentinel-1/Sentinel-2. Falta una prueba de componente formal como la pedida por v6. |
| Next.js 14 App Router | No cubierto | El proyecto usa Vite + React + Express + tRPC, que es la plantilla WebDev disponible en esta sesión. |
| Estructura `src/app`, `src/lib`, `src/hooks`, `src/types` | No cubierta literalmente | Existe una estructura equivalente, pero no con los paths de Next.js de v6. |
| Supabase Auth con `signUp/signIn/signOut` | No cubierto literalmente | Existe Manus OAuth funcional. No existe flujo de credenciales Supabase ni middleware Supabase. |
| `tenant_id` derivado desde tabla `users` | Parcial | El artefacto Supabase define `tenant_id` en entidades, pero la aplicación demo no persiste todavía usuarios, tenants ni tenant context en la base real. |
| Supabase schema completo | Parcial | `supabase/schema.sql` contiene tenants, predios, solicitudes, mediciones y workflow_logs. Faltan `users`, `informes`, `consumo`, `suscripciones` y `alertas` de v6. |
| RLS en todas las tablas v6 | Parcial | Las tablas presentes tienen RLS y `get_current_tenant_id()`. No puede declararse cumplimiento completo mientras falten las tablas v6 restantes y una prueba SQL ejecutable. |
| Función `get_current_tenant_id()` exacta de v6 | Diferente | El schema actual lee `tenant_id` del JWT claim para evitar dependencia recursiva. v6 propone consultar `users` con `SECURITY DEFINER`. Ambas son decisiones posibles, pero no deben mezclarse. |
| Política de `workflow_logs` tenant + admin | Parcial | El schema actual filtra por tenant, pero todavía no implementa el chequeo de rol admin definido por v6. |
| Seed con 2 tenants, usuarios, 3 predios por tenant | No cubierto | El seed actual tiene 2 tenants y 3 predios totales, sin tabla users ni dos usuarios por tenant. |
| 5 mediciones por predio | No cubierto | El seed actual contiene mediciones mínimas para demostrar Sentinel-1/Sentinel-2. |
| Informes seed por predio | No cubierto | No existe aún la tabla ni el seed de informes. |
| Tests SQL de aislamiento RLS | No cubierto | Solo existen pruebas Vitest de dominio y auth. No existe `tests/rls.test.sql` ejecutable. |
| Tests de API de auth/predios/informes | No cubierto literalmente | Existe una mutación tRPC de solicitudes, pero no los endpoints REST de v6 ni sus suites específicas. |
| Dify onboarding, interpretación y soporte | Parcial | Existe interpretación determinista y un contrato de prompt orientado a Dify. No hay tres agentes Dify configurados ni integración de red. |
| Dify RAG con documentos | No cubierto | No hay base de conocimiento cargada. |
| n8n weekly update | No cubierto | No existe `n8n/workflows/sentinel-weekly-update.json`. |
| Stripe, WhatsApp y Sentinel Hub fuera de alcance | Cubierto | No se agregaron integraciones reales. README documenta que son Fase 2. |
| `.env.example` exacto de v6 | Parcial | El entorno gestionado impide editar `.env.example` directamente. Las variables satelitales están documentadas en `docs/satellite-env.example`; no se deben copiar credenciales reales. |
| README con setup completo de v6 | Parcial | README documenta catálogo, fail-safe, tests y pendientes. Faltan instrucciones específicas de Supabase Auth, migración SQL y n8n porque aún no están implementados. |

## 3. Contradicciones entre v6 y v7/v8

| Tema | v6 | v7/v8 | Decisión recomendada |
| --- | --- | --- | --- |
| Stack | Next.js 14 + Supabase | La especificación satelital no exige cambiar stack; el proyecto actual usa WebDev full-stack | Mantener el stack actual para el MVP y documentar Supabase como target de migración. |
| Tier 1 | 0,5–50 ha | v8 también usa menos de 50 ha | Mantener la regla actual. |
| Tier 2 | 50–500 ha | v8 usa 50–499 ha y Tier 3 desde 500 ha | Mantener límites sin solapamiento: `<50`, `<500`, `>=500`. |
| Sentinel-3 en agricultura | v6 lo excluye del selector, pero lo menciona como posible contexto regional en la matriz | v8 lo excluye de agricultura MVP | Mantenerlo excluido de solicitudes agrícolas. El Tier 3 regional queda como stub, no como habilitación accidental de Sentinel-3. |
| `mediciones` | Índice genérico `indice` | v8 exige `satelite`, `variable`, `unidad` | Mantener el modelo v8. |
| `get_current_tenant_id()` | Consulta `users` con `SECURITY DEFINER` | El artefacto actual usa JWT claim `tenant_id` | Elegir una sola estrategia al migrar. Para Supabase final, usar función `SECURITY DEFINER` y pruebas de recursión/RLS explícitas. |
| Roles | v6 usa `admin` y `viewer` | La plantilla Manus usa `admin` y `user` | No mapear automáticamente. Definir un modelo de roles antes de conectar Supabase Auth. |

## 4. Riesgos si se afirma cumplimiento total ahora

Afirmar que v6 está completa ocultaría riesgos importantes. Un tenant no tiene todavía aislamiento probado en una base Supabase real. Los informes, consumo, suscripciones y alertas no tienen tablas ni políticas operativas. El workflow semanal no existe. La integración Dify no está conectada. El seed no permite reproducir el escenario completo de dos usuarios y dos tenants.

El riesgo satelital específico sí está mitigado en el MVP actual. Una variable de entorno no puede ampliar la política de producto de una vertical. La solicitud se valida antes de crear la operación. Las pruebas cubren una configuración que intenta habilitar Sentinel-3 en agricultura y una configuración con valores desconocidos.

## 5. Criterio de salida para declarar v6 completa

La versión v6 solo debería declararse completa cuando se cumplan simultáneamente estas condiciones:

1. Existe una decisión explícita de migrar o no migrar de la plantilla WebDev actual a Next.js/Supabase.
2. El schema incluye todas las tablas v6 con `tenant_id`, RLS y políticas revisadas.
3. `users`, roles y tenant context están conectados a la autenticación real.
4. El seed tiene dos tenants, dos usuarios por tenant, tres predios por tenant, cinco mediciones por predio e informes de prueba.
5. `tests/rls.test.sql` demuestra lecturas permitidas para Tenant A y cero filas para Tenant B.
6. Existen pruebas de API para autenticación, predios e informes.
7. Dify tiene contratos protegidos y fallback silencioso cuando no hay API key.
8. Existe el workflow n8n stub con consulta, medición, alerta y log.
9. El README contiene instrucciones reproducibles de setup, variables y pendientes de Fase 2.

## 6. Recomendación

El estado actual es adecuado como **MVP visual y de dominio satelital endurecido**, pero no como implementación completa de la arquitectura v6. La siguiente fase debe priorizar la base multi-tenant real y las pruebas RLS antes de conectar proveedores externos. No conviene agregar Sentinel Hub, Stripe o WhatsApp antes de resolver esa base, porque las integraciones externas amplificarían cualquier error de aislamiento o de configuración.

## Referencias

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[2]: https://supabase.com/docs/guides/auth/auth-helpers/nextjs "Supabase Auth helpers for Next.js"
[3]: https://docs.n8n.io/hosting/starter-kits/ "n8n workflow and hosting documentation"
