# Guía de elección satelital de Cleanleaf

## Decisión de producto

La propuesta v10 se incorpora como una sección de configuración orientada a **necesidades**, no como una lista técnica. El cliente primero expresa qué quiere resolver —vigor, nubosidad, riego, encharcamiento, acuicultura, sequía regional o monitoreo forestal— y después recibe una combinación sugerida de fuentes.

La regla recomendada para el MVP agrícola es:

- **Sentinel-2 como fuente principal** para vigor, cobertura y lectura óptica de cultivos cuando existe una escena despejada.
- **Sentinel-1 como complemento o respaldo** para continuidad con nubosidad y para señales de humedad/estructura, riego, drenaje y cambios superficiales.
- **Sentinel-1 + Sentinel-2** cuando la decisión necesita relacionar respuesta de la vegetación con condiciones de humedad o cuando la nubosidad puede producir brechas.
- **Sentinel-3** para preguntas regionales o marinas, no para predios agrícolas pequeños. La experiencia lo muestra como Fase 2 hasta completar el adaptador Copernicus correspondiente.

## Qué se implementó

La ruta `/dashboard/configuracion/satelites` ahora incluye selector de sector, selector de necesidad, recomendación explicada, tarjetas comparativas, variables principales, limitaciones, escenarios de cambio y una explicación de Copernicus como ecosistema. La configuración se puede guardar localmente como preferencia del navegador mientras la persistencia de tenant todavía no está conectada a Supabase.

La interfaz diferencia **Disponible MVP** de **Fase 2**. Un recurso futuro no puede activarse por accidente. Para acuicultura, por ejemplo, Sentinel-3 aparece como orientación de producto, pero no se presenta como una fuente operativa en esta pantalla hasta completar integración, validación de resolución y pruebas de contrato.

## Correcciones de precisión frente a la propuesta

La propuesta es correcta al presentar Sentinel-1 como radar de día/noche y todo tiempo, y Sentinel-2 como óptico para vegetación. Sin embargo, Cleanleaf evita afirmar que Sentinel-1 mide humedad de suelo de manera directa y universal: la señal radar debe interpretarse según producto, geometría, cobertura y condiciones del terreno. También evita prometer que Sentinel-3 sirve para predios pequeños; su utilidad es regional, marina o de temperatura/color de superficie.

Las frecuencias y resoluciones se muestran como valores orientativos. La resolución y revisita efectivas dependen del producto, modo de adquisición, latitud, cobertura de nubes, disponibilidad de escena y procesamiento. Antes de exponer SLA comerciales deben verificarse contra el producto CDSE elegido.

## Matriz operativa

| Necesidad del cliente | Fuente recomendada | Complemento | Motivo | Limitación principal |
| --- | --- | --- | --- | --- |
| Salud y vigor | Sentinel-2 | Sentinel-1 si hay brechas | Índices ópticos y detalle de vegetación | Nubes y luz solar |
| Nubosidad persistente | Sentinel-1 | Sentinel-2 cuando despeja | Mantiene continuidad radar | Interpretación más especializada |
| Riego y humedad | Sentinel-1 | Sentinel-2 | Contrasta señal de terreno con respuesta vegetal | No sustituye sensores de campo |
| Encharcamientos | Sentinel-1 | Sentinel-2 para evaluar daño vegetal | Radar útil después de lluvia y con nubes | Requiere umbrales y validación local |
| Acuicultura | Sentinel-3 | Sentinel-2/CMEMS en Fase 2 | Temperatura y color oceánico regional | Escala insuficiente para unidades pequeñas |
| Sequía regional | Sentinel-3 + Sentinel-2 | CDS/CAMS en Fase 2 | Contexto térmico/climático y vegetación | No se procesa automáticamente como Tier 3 |
| Forestal | Sentinel-2 + Sentinel-1 | CLMS en Fase 2 | Vigor, cobertura y continuidad bajo nubes | No debe venderse como detección automática de tala sin validación |

## Fuentes oficiales consultadas

- [Copernicus Sentinel-1](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-1): radar para observación de superficie con capacidades de día/noche y todo tiempo.
- [Copernicus Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2): observación óptica multiespectral de superficie terrestre y vegetación.
- [Copernicus Sentinel-3](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel3.html): color de superficie, temperatura de tierra/mar y productos oceánicos.
- [Copernicus Data Space](https://dataspace.copernicus.eu/): catálogo y plataforma de acceso que Cleanleaf debe integrar server-side.

## Pendientes de producción

1. Guardar preferencias en `tenant_satellite_preferences` con RLS; el localStorage actual es una solución de transición y no una fuente oficial.
2. Conectar cada selección con una variable, unidad, producto y proveedor reales antes de crear la solicitud.
3. Verificar cobertura, nubosidad, calidad y fecha de adquisición en CDSE; una revisita nominal no garantiza una observación utilizable.
4. Añadir pruebas E2E para agricultura, acuicultura y forestal, incluyendo bloqueo de fuentes fuera de política.
