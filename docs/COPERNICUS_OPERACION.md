# Guía de Operación y Políticas Copernicus CDSE

## 1. Políticas de Producción Configurable (`COPERNICUS_PROD_POLICY`)

La plataforma administra las consultas dirigidas al Copernicus Data Space Ecosystem (CDSE) mediante la variable de entorno `COPERNICUS_PROD_POLICY`:

- `synthetic_demo_only` (**Por defecto**): Bloquea consultas en vivo a la API Estadística de Copernicus. Devuelve respuestas sintéticas deterministas etiquetadas como `data_source: "synthetic"`.
- `live`: Habilita las consultas en vivo hacia CDSE únicamente cuando se configuran las credenciales `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET`.
- `disabled`: Desactiva completamente las consultas satelitales y retorna respuesta degradada.

> **Regla de Honestidad de Datos:** Los datos sintéticos nunca se mezclan silenciosamente con datos reales y son siempre expuestos con la etiqueta explícita `data_source: "synthetic"`.

---

## 2. Caché Compartida y Control de Cuotas

### Tabla `observation_cache`
Toda consulta ejecutada contra CDSE calcula un `cache_key` unívoco basado en `satelite:variable:bbox:periodoDesde:periodoHasta`.
- **TTL por defecto:** 5 minutos (300 segundos).
- Si existe un registro vigente en `observation_cache`, se retorna inmediatamente evitando llamadas repetidas a CDSE.

### Límites de Cuota y Backoff
- **Ventana de Cuota:** Máximo 60 peticiones por minuto.
- Si se alcanza el 80% de la cuota, el sistema registra una advertencia en los logs de producción.
- Ante un error HTTP `429 Too Many Requests` de CDSE, el sistema aplica backoff exponencial automático y reintenta tras el tiempo indicado en el encabezado `Retry-After`.

---

## 3. Calidad de Datos (Mascara SCL)

Las consultas Sentinel-2 evalúan los píxeles mediante el indicador SCL (Scene Classification Layer):
- Si el porcentaje de píxeles válidos (libres de nubes o sombras) es inferior al **60%**, la medición se registra con la etiqueta `confidence_level: "baja_confianza"`.
- El informe desplegará una recomendación automática invitando a ampliar el rango de fechas.

---

## 4. Solicitudes Tier 3 (> 5.000 Hectáreas)

Las solicitudes de análisis que superan las **5.000 ha** son encoladas automáticamente en estado `requiere_revision`.
- No consumen cuota de procesamiento de inmediato.
- Los administradores pueden evaluar y autorizar su reintento/procesamiento desde la pestaña **Solicitudes Fallidas/Pendientes** en `/dashboard/admin`.

---

## 5. Incompatibilidad de Variable SST (Sea Surface Temperature) en CDSE Sentinel Hub

En la API Estadística de Sentinel Hub integrada en CDSE, la medición de **SST** (Sea Surface Temperature) requiere la colección de productos `SLSTR L2 WST` (Sentinel-3 Sea and Land Surface Temperature Radiometer Level-2 Water Surface Temperature).

- **Limitación en CDSE Statistical API:** Sentinel Hub en CDSE ofrece únicamente Sentinel-3 OLCI y SLSTR L1B/L2 genérico, sin soporte para procesamiento ni agregación estadística directa de `SLSTR_L2_WST` para obtener SST.
- **Política de la Plataforma:** La variable `sst` ha sido removida del catálogo activo de Sentinel-3 y se rechaza explícitamente en la validación de entrada (`INVALID_SATELLITE_VARIABLE`). No se generan ni simulan valores inventados para `sst`.
- **Alternativa Oficial:** La consulta de temperatura superficial del mar para acuicultura u oceanografía debe canalizarse mediante la API de **Copernicus Marine Service (CMEMS)**, planeada para la Fase 2 de la plataforma.

---

## 6. Procedimiento ante Caídas o Interrupciones de CDSE

1. Si CDSE experimenta degradación o tiempos de respuesta superiores a 10 segundos, el worker reintentará hasta 3 veces.
2. Si los reintentos fallan, la solicitud pasa al estado `error_final` sin consumir cuota del tenant.
3. El administrador puede conmutar temporalmente la política a `COPERNICUS_PROD_POLICY=synthetic_demo_only` mientras Copernicus restablece sus servicios.
