# Dashboard de informes — análisis y alcance aplicado

## Decisión de producto

La propuesta v11 se implementó como un **centro operativo de informes**, no como una tabla aislada. Cada informe muestra qué se solicitó, dónde está, cuál fue la última actividad, qué fuente y variables intervienen y qué acción puede tomar el cliente. El progreso no se presenta como una animación decorativa: `0–100%` representa etapas explícitas del flujo y solo llega a verde completo cuando el estado es `completado`.

## Estado visual del progreso

| Progreso | Color | Significado |
| ---: | --- | --- |
| 0–33% | Rojo | Inicio, validación o bloqueo temprano |
| 34–66% | Ámbar | Procesamiento intermedio |
| 67–99% | Lima | Validación e interpretación avanzadas |
| 100% | Verde | Medición, interpretación y resumen disponibles |
| Error | Rojo | El flujo no terminó; se muestra causa y reintento |
| Revisión | Naranja | Requiere autorización; no consume cuota ni simula avance |

## Rutas incorporadas

- `/dashboard/informes`: dashboard con resumen ejecutivo, búsqueda, filtros por predio, fuente y estado, tarjetas de progreso, última actividad y enlaces de trazabilidad.
- `/dashboard/informes/:id`: detalle de informe con timeline, ficha de análisis, métricas, resumen ejecutivo, recomendación y descargas.

## Qué se incluyó

La experiencia muestra cinco estados demostrables: informe listo, procesando, fallo reintentable, requiere revisión y un estado normal con progreso. Cada registro incluye `tenantId`, predio, periodo, fuentes, variables, `status`, `progress`, `currentStep`, `trace`, métricas y recomendación. La trazabilidad registra actor, fecha, estado, mensaje y detalle.

Los informes completos habilitan tres salidas prácticas en el MVP de interfaz: Markdown descargable, impresión para guardar como PDF y documento Word compatible mediante HTML descargable. La exportación PDF/Word con plantilla profesional nativa debe reemplazarse por un generador server-side o una librería validada cuando el informe se persista en producción.

## Recomendaciones aplicadas a la propuesta

La estructura tipo consultora es útil si la respuesta aparece antes que la evidencia. Por eso el detalle comienza con resumen ejecutivo y recomendación, continúa con métricas y termina con trazabilidad. No se incorporan cifras de ROI, pérdida potencial o benchmarks agronómicos como hechos automáticos: solo deben aparecer cuando existan datos de campo, clima y un método de cálculo documentado.

Dify debe permanecer después de la medición y del informe base determinista. Si el agente no responde, el cliente debe seguir viendo estado, valores, gráficos disponibles, limitaciones y recomendación base. Los “insights no solicitados” deben etiquetarse como hallazgos sugeridos, con fuente, fecha y nivel de confianza; nunca como diagnóstico agronómico definitivo.

## Pendientes de producción

1. Reemplazar `shared/report-catalog.ts` por consultas persistidas a Supabase con RLS y filtros por `tenant_id`.
2. Conectar el detalle a `solicitudes_analisis → mediciones → informes → workflow_logs` mediante `solicitud_id` y `correlation_id`.
3. Implementar polling o suscripción para que el porcentaje se actualice desde n8n/worker real, no desde datos estáticos.
4. Crear endpoint de descarga server-side para PDF y DOCX, con autorización y auditoría.
5. Agregar Playwright para comprobar creación, cambio de estado, descarga, reintento y aislamiento entre tenants.
6. Configurar agentes Dify server-side con secretos, schema JSON estricto y fallback determinista.
