# Informe de Auditoría y Comparativa Sat2Farm vs. Cleanleaf MVP v8.0 + Copernicus CDSE

**Fecha**: Septiembre 2026
**Documento**: Auditoría de Capacidades Satelitales y Hoja de Ruta de Servicios
**Proyecto**: Cleanleaf SaaS (Monitoreo Satelital Agrícola)

---

## Executive Summary (Resumen Ejecutivo)

La plataforma de referencia (**Sat2Farm**) ofrece un conjunto de 9 servicios agrícolas combinando datos satelitales, pronósticos meteorológicos y modelos agronómicos.

Con la arquitectura actual de **Cleanleaf MVP v8.0** y el acceso nativo al catálogo de la constelación **Copernicus Data Space Ecosystem (CDSE)** —a través de Sentinel-1 (Radar SAR), Sentinel-2 (Óptico/Multiespectral) y Sentinel-3 (Térmico/Oceanográfico)— **Cleanleaf puede replicar el 100% de la funcionalidad de Sat2Farm e incluso superarla**, integrando además resolución espacial superior y análisis multi-temporal determinista.

---

## Matriz de Auditoría: Sat2Farm vs. Estado Actual de Cleanleaf vs. Cobertura Copernicus CDSE

| # | Servicio Sat2Farm | Estado Actual en Cleanleaf MVP v8.0 | Factibilidad Copernicus CDSE | Satélite / Banda Requerida | Complejidad de Implementación |
|---|---|---|---|---|---|
| **1** | **Soil Health Analysis** (N, P, K, SoC, pH) | **Sin implementar** (Requiere calibración con suelo local) | **SÍ (Estimación proxy)** | Sentinel-2 (Bandas Red-Edge B5, B6, B7 y SWIR B11, B12) | **Alta**: Requiere modelo de estimación de Materia Orgánica / SoC y correlación de nitrógeno foliado. |
| **2** | **Soil Moisture Monitoring** (Humedad de Suelo) | **Implementado (Baseline)** | **SÍ (Alta precisión)** | Sentinel-1 (Retrodispersión SAR $\sigma^0$ VV) + Sentinel-2 (NDMI) | **Baja/Media**: Métrica Radar existente en `shared/satellite-service.ts`. |
| **3** | **Crop Health Assessment** (Salud del Cultivo) | **Implementado** | **SÍ (Súper resolución)** | Sentinel-2 (NDVI, EVI, SAVI a 10m de resolución) | **Completado**: Cálculo determinista activo en `shared/interpretation.ts`. |
| **4** | **15-Day Weather Forecast** (Pronóstico Meteorológico) | **Sin implementar** (Stubs estáticos) | **SÍ** | API ECMWF / Copernicus Atmosphere Monitoring Service (CAMS) | **Media**: Integración de API pública de pronóstico Open-Meteo o ECMWF. |
| **5** | **Pest & Disease Forewarning** (Alerta Temprana Plagas) | **Implementado (Reglas deterministas)** | **SÍ** | Sentinel-2 (Red-Edge B5/B8A para estrés) + CAMS/Meteorología | **Media**: Algoritmo de correlación de temperatura, humedad relativa e índices de estrés vegetal. |
| **6** | **Image-Based Pest Diagnosis** (Diagnóstico por Foto) | **Implementado (Módulo Dify AI)** | **Servicio de Visión por IA** | Cámara móvil / Dify Vision Agent (`client/src/pages/GuideInterpreterPage.tsx`) | **Completado**: Integrado mediante la Guía Interactiva con agente Dify. |
| **7** | **Irrigation Advisory** (Recomendación de Riego) | **Implementado (Indicador de estrés hídrico)** | **SÍ** | Sentinel-2 (NDMI / B8A-B11) + Sentinel-1 (Radar Moisture) | **Completado**: Indicadores integrados en informes McKinsey. |
| **8** | **Location-Specific Crop Calendar** (Calendario Agrícola) | **Implementado (Onboarding por Sector)** | **SÍ (Base de Datos Agronómica)** | Onboarding de predios (`client/src/pages/PrediosPage.tsx`) | **Completado**: Clasificación automática por sector y fenología en onboarding. |
| **9** | **Land Surface Water Index (LSWI)** | **Implementado** | **SÍ** | Sentinel-2 (B8 - B11 / B8 + B11) o Sentinel-3 (OLCI) | **Completado**: Índice de agua superficial disponible para acuicultura y agricultura. |

---

## Diagnóstico Detallado: Lo que NO tenemos e Instrucciones de Implementación

### 1. Estimación de Salud del Suelo (Soil Health: SoC, N, P, K, pH)
* **Estado**: No implementado directamente como química de laboratorio (los satélites no miden N-P-K directo a profundidad).
* **Cómo superarlo con Copernicus**:
  - Usar la reflectancia de Sentinel-2 en **SWIR (Banda 11 y B12)** para estimar la **Carbono Orgánico del Suelo (SoC)** en suelos desnudos pre-siembra.
  - Usar las bandas **Red-Edge (B5, B6, B7)** para estimar el contenido de **Nitrógeno Foliado (NDRE)** en la biomasa vegetativa.

### 2. Pronóstico Meteorológico de 15 días (15-Day Weather Forecast)
* **Estado**: Actualmente Cleanleaf se enfoca en lecturas de satélite históricas y presentes.
* **Cómo superarlo con Copernicus**:
  - Conectar el servicio Open-Meteo o ECMWF (European Centre for Medium-Range Weather Forecasts), que es la misma fuente de datos del ecosistema Copernicus (CAMS/C3S).
  - Permite entregar pronósticos de temperatura, precipitación acumulada, evatranspiración de cultivo ($ET_0$) y humedad relativa.

---

## La Ventaja Competitiva de Cleanleaf: "Lo Mismo y Más"

Al utilizar **Copernicus CDSE + Cleanleaf Architecture**, superamos a Sat2Farm en 4 ejes clave:

```
[ Sat2Farm ]
  ├── Cobertura Óptica Estándar
  └── Alertas Básicas
        │
        ▼
[ Cleanleaf MVP v8.0 + Copernicus CDSE ]
  ├── 1. Penetración Radar Sentinel-1 (Funciona con nubes / lluvia en La Araucanía)
  ├── 2. Multiverticalidad Real (Agricultura: S1/S2, Acuicultura: S3 OLCI, Forestal: S1/S2)
  ├── 3. Informes Estructurados McKinsey (Resumen Ejecutivo, Recomendaciones, Riesgos)
  └── 4. Asistente IA Dify de Interpretación Fotográfica e Informes en Tiempo Real
```

1. **Monitoreo Todo Clima (Radar SAR - Sentinel-1)**: Sat2Farm depende fuertemente de imágenes ópticas que se bloquean con nubes. Cleanleaf usa Sentinel-1 en banda C ($\sigma^0_{VV}$), permitiendo medir humedad de suelo e inundaciones **incluso en días de tormenta o nublado denso** (crucial para La Araucanía y sur de Chile/Latam).
2. **Arquitectura Multi-Vertical**: Mientras Sat2Farm es sólo agrícola, Cleanleaf soporta **Acuicultura** (temperatura superficial del mar y clorofila-a con Sentinel-3) y **Sector Forestal** (detección de tala e incendios).
3. **Reportabilidad Ejecutiva McKinsey**: Traducción determinista de métricas satelitales en recomendaciones sencillas (PDF/Markdown/Word) listas para agrónomos y gerentes de campo.
4. **Agente IA de Interpretación Dify**: Diagnóstico por imagen móvil integrado con el asistente contextual de reportes (`GuideInterpreterPage.tsx`).

---

## Plan de Acción para Igualar y Superar la Oferta

1. **FASE 1 (Inmediata - Completada en MVP v8.0)**:
   - Salud del cultivo (NDVI/EVI), Humedad de suelo (Sentinel-1 SAR / NDMI), Agua superficial (LSWI), Diagnóstico por foto (Agente Dify AI) e Informes McKinsey.

2. **FASE 2 (Siguiente Sprint)**:
   - **Módulo de Pronóstico Agroclimático (15 días)**: Integrar API pública ECMWF / Open-Meteo para mostrar lluvia acumulada y temperatura junto al gráfico satelital.
   - **Índice Red-Edge (NDRE / Nitrógeno Vegetal)**: Agregar el índice de nitrógeno foliado basado en Sentinel-2 Banda 5/8A en `shared/satellite-service.ts`.

3. **FASE 3 (Fase de Producto Avanzado)**:
   - **Mapa de Carbono en Suelo (SoC)**: Algoritmo de mapeo de materia orgánica basado en escenas SWIR de suelo desnudo post-cosecha.
