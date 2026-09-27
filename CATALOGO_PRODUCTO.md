# AgroPulso / Cleanleaf — Catálogo de Productos y Planes (Fase 1)

**Versión:** 1.0.0
**Fecha:** 24 de Septiembre de 2026
**Estatus:** Aprobado / Definición de Producto

---

## 1. Catálogo de Informes Satelitales

| ID Informe | Nombre Comercial | Pregunta que Responde al Productor | Misión Copernicus Fuente | Frecuencia de Revisita | Nivel de Plan Mínimo |
| --- | --- | --- | --- | --- | --- |
| `inf_ndvi` | Salud de Cultivo (NDVI) | ¿Dónde está estresada la planta o la biomasa? | Sentinel-2 (Óptico, 10m) | ~5 días | Piloto |
| `inf_radar_humedad` | Humedad de Suelo Radar | ¿Necesito regar hoy aunque haya cielo nublado? | Sentinel-1 (Radar SAR, C-band) | ~6-12 días | Piloto |
| `inf_cambio_uso` | Detección de Cambios | ¿Hubo labores de cosecha, siembra o anomalías? | Sentinel-2 (Series temporales) | ~5 días | Regional PyME |
| `inf_calidad_agua` | Calidad de Agua en Embalses | ¿Hay riesgo de turbidez o proliferación algal? | Sentinel-3 (OLCI / SLSTR) | 1-2 días | Región Completa |

---

## 2. Estructura Comercial de Planes y Precios

| Plan | Límite Hectáreas/Mes | Límite Predios Activos | Análisis Regionales (Tier 3 >5.000 ha) |
| --- | --- | --- | --- |
| **Piloto** | 50 ha | 5 predios | No permitido |
| **Regional PyME** | 5.000 ha | 50 predios | No permitido |
| **Región Completa** | Ilimitado | 1.000 predios | Permito (Batch API) |

---

## 3. Mapeo con Capa de Dominio Técnico (`shared/`)

- Las reglas de fuentes permitidas por vertical viven strictly en `shared/satellite-catalog.ts`.
- La asignación automática de Tier según hectáreas es evaluada por `shared/satellite-router.ts`.
- Los límites mensuales de consumo por plan están respaldados por `shared/plan-limits.ts`.
