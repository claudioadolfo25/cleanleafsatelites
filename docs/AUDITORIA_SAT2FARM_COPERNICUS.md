# AUDITORÍA TÉCNICA HONESTA Y PLAN DE ACCIÓN (SAT2FARM vs. CLEANLEAF MVP v8.0)

**Fecha**: Septiembre 2026
**Documento**: Evaluación de Cobertura Agronómica y Honestidad de Datos
**Estado**: Implementado y Validado con Suites de Pruebas

---

## 1. Resumen de la Auditoría Técnica Honesta (3 Estados por Servicio)

A diferencia de estimaciones genéricas, este informe clasifica cada uno de los 9 servicios de Sat2Farm en **tres estados estrictos**:
- **Completo**: Servicio funcionando con datos reales/servicios activos y lógica agronómica respaldada.
- **Proxy (con limitaciones)**: Indicador derivado de sensores ópticos/radar que requiere calibración de campo o suelo desnudo, presentado honestamente como estimación indirecta.
- **No disponible**: Servicio no alcanzado por satélite o que requiere fuentes terrestres adicionales.

---

## 2. Matriz Honestidad de Servicios (Sat2Farm vs. Cleanleaf MVP v8.0)

| # | Servicio Sat2Farm | Estado Honesto Cleanleaf | Fuente de Datos / Método Real | Nivel de Transparencia y Etiquetas |
|---|---|---|---|---|
| **1** | **Soil Health Analysis** (N, P, K, SoC, pH) | **Proxy (con limitaciones)** | Sentinel-2 (SWIR B11/B12 para SoC en suelo desnudo + NDRE B5/B8A para nitrógeno foliar) | **Transparente**: Etiquetado como "Estimación indirecta / requiere laboratorio". N-P-K directo y pH no son medibles por satélite. Muestras de laboratorio en `soil_samples`. |
| **2** | **Soil Moisture Monitoring** | **Completo** | Sentinel-1 SAR ($\sigma^0_{VV}$ radar todo clima) + Sentinel-2 NDMI | Presentado como "Índice relativo de humedad de suelo" comparado con la serie histórica del predio. |
| **3** | **Crop Health Assessment** | **Completo** | Sentinel-2 (NDVI, EVI, SAVI) a 10m de resolución | Cálculo determinista sobre píxeles libres de nubes con SCL. |
| **4** | **15-Day Weather Forecast** | **Completo** | Open-Meteo API + Reanálisis ERA5 | Temperatura max/min, precipitación acumulada, humedad relativa y evapotranspiración $ET_0$ FAO. |
| **5** | **Pest & Disease Forewarning** | **Completo** | Correlación Open-Meteo (T° + Humedad Relativa) + Estrés vegetativo (NDRE/NDVI) | Reglas deterministas que muestran las variables desencadenantes. |
| **6** | **Image-Based Pest Diagnosis** | **Completo** | Asistente de Visión Dify AI (`GuideInterpreterPage.tsx`) | Diagnóstico asistido por fotos móviles y contextualizado con el informe del predio. |
| **7** | **Irrigation Advisory** | **Completo** | Balance hídrico: NDMI + Radar Sentinel-1 + $ET_0$ FAO + Lluvia pronosticada 15 días | Recomendaciones directas (regar / esperar / vigilar) justificadas en datos reales. |
| **8** | **Crop Calendar** | **Completo** | Grados-Día Acumulados (GDD) (`shared/crop-calendar.ts`) | Seguimiento fenológico por cultivo (maíz, trigo, avena, papa, raps, manzano, cerezo, pradera) con tareas críticas. |
| **9** | **Land Surface Water Index (LSWI)** | **Completo** | Sentinel-2 L2A exclusivamente: $\frac{B8 - B11}{B8 + B11}$ | **Corrección**: LSWI sólo utiliza Sentinel-2 (SWIR B11). Sentinel-3 OLCI no posee banda SWIR. |

---

## 3. Principios de Honestidad y Trazabilidad de Datos (Tarea 1)

Para prevenir la presentación de datos simulados como reales en producción:
1. **Insignia "Dato Simulado" (`simulated_badge`)**: Todo resultado generado mediante fallback sintético incluye el metadato `data_source: "fallback_simulated"`, la insignia `simulated_badge: true` y confianza `"baja"`.
2. **Bloqueo en Producción**: Cuando `APP_ENV === "production"`, los fallbacks sintéticos son bloqueados en runtime, retornando `data_source: "unavailable"` con mensaje descriptivo para evitar engaño al usuario.
3. **Metadatos de Trazabilidad**: Cada informe incluye `acquisition_date`, `cloud_cover_pct` y nivel de `confidence` ("alta" | "media" | "baja").

---

## 4. Mejoras Agronómicas Implementadas

### A. Pronóstico Agroclimático 15 Días (`shared/weather-service.ts`)
- Integrado el motor de Open-Meteo para obtener temperatura máxima y mínima diaria, humedad relativa, lluvia acumulada a 15 días y evapotranspiración de referencia $ET_0$ (FAO-56 Penman-Monteith).
- Reemplazada la asociación errónea de CAMS/CDS como pronósticos operativos a 15 días.

### B. Calendario Agrícola y Grados-Día (`shared/crop-calendar.ts`)
- Mapeo de etapas fenológicas y umbrales GDD para 8 cultivos principales (maíz, trigo, avena, papa, raps, manzano, cerezo, pradera).
- Cálculo acumulado de GDD sobre base térmica específica por cultivo y asignación de tareas agronómicas críticas.

### C. Proxies de Suelo y Nitrógeno (`shared/satellite-catalog.ts`)
- Integrado el índice **NDRE** ($\frac{B8A - B5}{B8A + B5}$) para clorofila y nitrógeno foliado.
- Integrado el índice **SWIR** (NBR2 / ratio $B11/B12$) para estimación de Materia Orgánica / Carbono Orgánico del Suelo (**SoC**) condicionado a ventanas de suelo desnudo (NDVI < 0.25).
- Tabla `soil_samples` en Supabase con aislación RLS para calibración de laboratorio con muestras terrestres de $N, P, K, pH$ y $SoC$.

---

## 5. Ventaja Competitiva Verificable de Cleanleaf

1. **Radar SAR Todo Clima (Sentinel-1)**: Capacidad de medir índices de humedad en suelo durante episodios de lluvia/nubosidad continua sin depender de cielo despejado.
2. **Platfoma Multivertical**: Cobertura para Agricultura (S1/S2), Acuicultura (S3 OLCI/SLSTR para temperatura de agua y clorofila-a) y Forestal (S1/S2).
3. **Informes Ejecutivos McKinsey**: Traducción de datos satelitales en resúmenes ejecutivos con recomendaciones concretas descargables en PDF, Word y Markdown.
4. **Pruebas Automatizadas**: Suite completa ejecutando 50 pruebas en 9 archivos de test (`pnpm test`) y chequeo de tipos estricto (`pnpm check` = 0 errores).
