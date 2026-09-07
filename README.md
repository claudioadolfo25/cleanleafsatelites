

---

## Cleanleaf MVP — Alcance satelital

Cleanleaf es un SaaS de monitoreo para agricultura que traduce lecturas satelitales en decisiones simples para productores. El MVP está configurado para el piloto agrícola en La Araucanía y separa explícitamente dos decisiones de cada solicitud: el **tamaño del área**, que determina un tier de análisis, y la **fuente de datos**, que determina qué variables se consultan.

| Vertical | Fuentes habilitadas en el MVP | Uso principal |
| --- | --- | --- |
| Agricultura | Sentinel-2, Sentinel-1 | Vigor vegetal, humedad y respaldo ante nubosidad |
| Acuicultura | Sentinel-3, Sentinel-2 | Temperatura superficial y clorofila-a |
| Forestal | Sentinel-2, Sentinel-1 | Salud vegetal y monitoreo bajo nubosidad |

La regla de habilitación vive exclusivamente en `shared/satellite-catalog.ts`. La API valida todas las solicitudes contra ese catálogo antes de crear una operación. Por ejemplo, una solicitud agrícola que intenta usar Sentinel-3 se rechaza; una solicitud acuícola con Sentinel-3 se acepta.

### Variables simuladas y contrato de integración

La capa `shared/satellite-service.ts` contiene stubs deterministas que devuelven siempre el mismo contrato: `{ satelite, variable, valor, unidad, fecha_adquisicion }`. Sentinel-2 expone índices como NDVI, Sentinel-1 expone métricas radar como `sigma0_vv` y Sentinel-3 expone variables térmicas u oceánicas como `sst`. En una integración futura se reemplazará únicamente la implementación interna por el proveedor real, sin cambiar los consumidores de la API.

### Fuera de alcance

**Sentinel-4, Sentinel-5P y Sentinel-6 están explícitamente fuera del catálogo y fuera del alcance del producto.** Estas misiones se orientan a calidad de aire, química atmosférica o altimetría y no aportan valor directo al monitoreo de agricultura, acuicultura costera o forestal planteado por Cleanleaf. No deben agregarse como opciones activables sin una evaluación de producto independiente.

### Configuración opcional

El catálogo usa estos valores de respaldo cuando las variables de entorno no se definen:

```bash
CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA=sentinel-2,sentinel-1
CLEANLEAF_SATELITES_HABILITADOS_ACUICULTURA=sentinel-3,sentinel-2
CLEANLEAF_SATELITES_HABILITADOS_FORESTAL=sentinel-2,sentinel-1
```

### Validación

Ejecutar la batería de pruebas y la comprobación estática con:

```bash
pnpm test
pnpm check
```
