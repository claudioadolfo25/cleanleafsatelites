# Auditoría Comparativa de Funcionalidades: Cleanleaf vs. Sat2Farm / Copernicus CDSE

El presente documento establece la evaluación honesta y transparente sobre el nivel de soporte, origen de datos y estado de implementación de los servicios de monitoreo satelital en Cleanleaf comparados con referencias de la industria como Sat2Farm y las capacidades nativas del programa europeo **Copernicus Data Space Ecosystem (CDSE)**.

---

## Tabla de Clasificación Transparente

Para evitar falsas expectativas, cada servicio se clasifica rigurosamente en tres niveles:
- **Implementado (Real / CDSE):** Consulta real a través de APIs de Copernicus (Statistical API, STAC v1) o fuentes meteorológicas validadas (Open-Meteo).
- **Simulado (Demostración):** Modelos estocásticos/deterministas para pruebas de desarrollo, claramente señalizados en la UI con la etiqueta `simulado` o badge "Datos de demostración".
- **Declarado (Fase Futura / No Medible por Satélite):** Capacidades conceptuales o estimaciones indirectas que requieren correlación de laboratorio o sensores de terreno.

| Servicio / Variable | Estado en Cleanleaf MVP | Fuente de Datos Real | Observación Agronómica & Aclaración Técnica |
| --- | --- | --- | --- |
| **Vigor Vegetal (NDVI, NDRE)** | **Implementado** | Sentinel-2 L2A | Cálculo de reflectancia óptica multiespectral con máscara de nubes `SCL`. |
| **Humedad de Suelo y Estres Hídrico (NDMI, LSWI)** | **Implementado** | Sentinel-2 (SWIR) & Sentinel-1 (Radar) | Medición de agua foliar y coeficiente de retrodispersión radar $\sigma^0$ VV/VH. Se expresa como índice relativo al histórico del predio. |
| **Pronóstico Meteorológico y Evapotranspiración ($ET_0$)** | **Implementado** | Open-Meteo & CDS (Climate Data Store) | Pronóstico a 15 días, radiación, temperatura y cálculo de evapotranspiración de referencia FAO-56. |
| **Etapas Fenológicas y Grados Día ($GDD$)** | **Implementado** | Algoritmo GDD Interno + Open-Meteo | Seguimiento del desarrollo del cultivo basado en acumulación térmica acumulada. |
| **Temperatura Superficial del Mar / Agua (SST)** | **Implementado** | Sentinel-3 SLSTR | Monitoreo térmico para el vertical de acuicultura costera y estuarios. |
| **Clorofila y Color del Agua** | **Implementado** | Sentinel-3 OLCI | Estimación de pigmentación de algas para acuicultura. |
| **Clasificación Uso de Suelo (CLMS)** | **Declarado** | Copernicus Land (CLMS) | Capacidad declarada para Fase 2 en módulos territoriales y forestales. |
| **Alertas de Emergencias / Incendios (CEMS)** | **Declarado** | Copernicus Emergency (CEMS) | Recurso futuro reservado para eventos extremos y catástrofes. |
| **Monitoreo Nutricional N-P-K (Nitrógeno, Fósforo, Potasio)** | **Estimación Indirecta / Declarado** | No medible directamente por satélite | **Aclaración agronómica:** Ningún satélite óptico o radar mide directamente la concentración química de nitrógeno, fósforo o potasio en el suelo. Se proporciona una estimación indirecta de nitrógeno foliar a través de clorofila (NDRE); Fósforo y Potasio requieren análisis químico de suelo en laboratorio. |

---

## Nota Agronómica sobre Estimaciones de N-P-K

A diferencia de afirmaciones comerciales simplificadas, Cleanleaf adopta una política de **honestidad técnica**:

1. **Nitrógeno (N):** Correlacionado indirectamente con el índice **NDRE** (Normalized Difference Red Edge) mediante la masa de clorofila en el dosel foliar. No mide nitrógeno mineral en el suelo.
2. **Fósforo (P) y Potasio (K):** No poseen firma espectral directa en reflectancia solar ni respuesta en microondas radar. Cleanleaf integra formularios para cargar **muestras químicas de laboratorio** y no presenta lecturas satelitales ficiticias de N-P-K.
