# AUDITORÍA DE ESTADO REAL - AGROPULSO / CLEANLEAF
**Fecha de Auditoría:** 9 de Octubre de 2026
**Repositorio:** `https://github.com/claudioadolfo25/cleanleafsatelites`
**Despliegue Evaluado:** `https://cleanleafsatelites.onrender.com/`
**Modalidad:** Inspección y Verificación de Estado Real (Read-Only)

---

## 1. RESUMEN EJECUTIVO (Máximo 15 líneas)

1. **Lo que SÍ podemos ofrecer HOY a un cliente piloto (demostración/interfaz):**
   - Una interfaz web interactiva en React 19 / Tailwind CSS accesible públicamente en Render con navegación de tableros agrícolas, selección de satélites (Sentinel-1/2/3) y consulta de informes de demostración.
   - Cálculo determinista local de niveles de procesamiento (*tiers*) por superficie (`tier1_predio` <=50ha, `tier2_extendido` <=5000ha, `tier3_regional` >5000ha) y validación de límites de planes (`piloto`, `regional_pyme`, `region_completa`).
   - Respuestas tRPC con simulaciones estables (*hash* determinista por predio) para mediciones de NDVI, Sigma0 VV/VH y SST, junto con un motor de reglas de interpretación agronómica en español.

2. **Lo que NO podemos ofrecer hoy (sin mentir):**
   - **No hay procesamiento de píxeles ni imágenes satelitales reales:** No existe conexión HTTP a Copernicus Data Space Ecosystem (CDSE) ni clientes STAC/Process API.
   - **No hay autenticación ni base de datos activa:** La base de datos PostgreSQL/Supabase no está conectada en runtime; el servidor utiliza SQLite/MySQL (Drizzle) mockeado en memoria y bypass de login en `useAuth`.
   - **No hay exportación de informes PDF/Word reales:** Los botones en UI gatillan notificaciones toast simples o diálogos visuales sin generación binaria de documentos.

3. **Los 5 Bloqueos Principales para la Salida a Producción:**
   1. **Inexistencia de Cliente CDSE Real:** `MockCopernicusProvider` (`shared/observation-provider.ts:16`) genera valores falsos con `Math.random()` / hashing.
   2. **Base de Datos Desconectada en Producción:** `DATABASE_URL` no está configurada en Render ni existen tablas Postgres provisionadas en ejecuciones remotas.
   3. **Falta de Autenticación RLS Multi-tenant Operativa:** La UI salta la autenticación (`user` mockeado) y la base de datos no valida claims JWT.
   4. **Ausencia de Credenciales Copernicus en Entorno:** Faltan las variables `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET`.
   5. **Inexistencia de Motor de Exportación (PDF/DOCX) y Tareas Asíncronas:** Las solicitudes intensivas se procesan dentro del bucle principal de la petición HTTP tRPC.

---

## PARTE 1. ARQUITECTURA REAL

### a) Árbol de Directorios (2-3 niveles)
```
cleanleafsatelites/
├── client/                      # Frontend SPA React 19 + Vite
│   ├── public/                  # Archivos estáticos y favicons
│   └── src/                     # Código fuente del cliente (UI, componentes, páginas)
│       ├── components/          # Componentes React reutilizables (UI Radix, mapas, gráficos)
│       ├── contexts/            # Contextos de React (ThemeContext)
│       ├── hooks/               # Custom hooks de React (useMobile, etc.)
│       ├── lib/                 # Clientes e integración (tRPC, utilidades)
│       ├── pages/               # Páginas y vistas del enrutador SPA
│       ├── App.tsx              # Definición principal de rutas (Wouter)
│       ├── main.tsx             # Punto de entrada Vite/React
│       └── index.css            # Estilos globales y Tailwind CSS v4
├── server/                      # Backend Express + tRPC Node.js
│   ├── _core/                   # Infraestructura base (servidor HTTP, Auth OAuth, Vite dev, SDK)
│   ├── routers.ts               # Definición completa de procedimientos y rutas tRPC
│   ├── db.ts                    # Conexión a Drizzle ORM
│   ├── storage.ts               # Almacenamiento mock / S3 client
│   └── satellite-domain.test.ts # Tests unitarios del dominio satelital
├── shared/                      # Dominio y catálogo compartido Frontend/Backend
│   ├── _core/                   # Manejo de errores
│   ├── satellite-catalog.ts     # Catálogo de satélites y variables
│   ├── satellite-service.ts     # Lógica determinista de generación de mediciones
│   ├── satellite-router.ts      # Cálculo de tiers por superficie y tiempos
│   ├── plan-limits.ts           # Validación de cuotas de planes
│   ├── observation-provider.ts  # Proveedor mock de Copernicus y generador de informes
│   ├── interpretation.ts       # Motor de reglas de interpretación agronómica
│   ├── report-catalog.ts        # Datos mock de informes y trazabilidad
│   ├── copernicus-catalog.ts    # Catálogo de servicios Copernicus
│   └── analysis-state.ts        # Máquina de estados de solicitudes
├── drizzle/                     # Definición de esquema y migraciones Drizzle (MySQL)
│   ├── schema.ts                # Esquema Drizzle MySQL (usuarios)
│   └── migrations/              # Archivos de migración de Drizzle
├── supabase/                    # Esquema objetivo PostgreSQL / Supabase v7
│   ├── schema.sql               # Definición de tablas, índices y RLS Supabase
│   └── seed.sql                 # Datos iniciales para PostgreSQL
├── docs/                        # Documentación técnica, guías y auditorías
└── n8n/                         # Workflows declarados de automatización (JSON)
```

### b) Stack Real con Versiones (`package.json`)
- **Frontend:** React `^19.2.1`, React DOM `^19.2.1`, Vite `^7.1.7`, Wouter `^3.3.5` (parcheado a `3.7.1`), `@tanstack/react-query` `^5.90.2`, `@trpc/client` `^11.6.0`, Framer Motion `^12.23.22`, Tailwind CSS `^4.1.14` (`@tailwindcss/vite` `^4.1.3`).
- **Servidor:** Node.js ESM (`"type": "module"`), Express `^4.21.2`, `@trpc/server` `^11.6.0`, `tsx` `^4.19.1`, `esbuild` `^0.25.0`, `jose` `6.1.0`.
- **Base de Datos / ORM:** Drizzle ORM `^0.44.5`, Drizzle Kit `^0.31.4`, `mysql2` `^3.15.0`.
- **Librerías de Mapas:** Google Maps JS API Types (`@types/google.maps` `^3.58.1`), componente incrustado vía iframe/custom script en `client/src/components/Map.tsx`. *Sin Leaflet ni OpenLayers*.
- **Gráficos:** Recharts `^2.15.2`.
- **Exportación PDF/Word:** **NO EXISTE LIBRERÍA EN PACKAGE.JSON** (No hay `jspdf`, `pdfmake`, `docx`, ni `puppeteer`).

### c) Mapa de Rutas del Frontend (`client/src/App.tsx`)
1. `/` -> `client/src/pages/Home.tsx` (Dashboard principal con selección de predio, métricas y gráfico Recharts).
2. `/dashboard/configuracion/satelites` -> `client/src/pages/SatelliteConfiguration.tsx` (Panel de configuración de satélites Sentinel-1/2/3).
3. `/dashboard/informes` -> `client/src/pages/ReportsDashboard.tsx` (Listado e historial de informes con filtros).
4. `/dashboard/informes/:id` -> `client/src/pages/ReportDetail.tsx` (Detalle de informe individual y línea de tiempo de trazabilidad).
5. `/404` y fallback -> `client/src/pages/NotFound.tsx`.

*Menú/Sidebar (`client/src/components/DashboardLayout.tsx:28-31`):*
- Enlace `Page 1` -> `/` (Funcional).
- Enlace `Page 2` -> `/some-path` (**ENLACE ROTO**: Redirige a página 404 `NotFound.tsx`).

### d) Mapa de la API (`server/routers.ts` & `server/_core/systemRouter.ts`)
| Endpoint tRPC | Archivo:Línea | Método | Validación Input | Auth Requerida | Tablas que Toca | Servicios Externos |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `system.health` | `server/_core/systemRouter.ts:9` | Query | No | No | Ninguna | Ninguno |
| `system.notifyOwner` | `server/_core/systemRouter.ts:16` | Mutation | Zod (`title`, `content`) | No | Ninguna | Forge Notification API (Mock/Fetch) |
| `auth.me` | `server/routers.ts:133` | Query | No | No | Ninguna | Ninguno |
| `auth.logout` | `server/routers.ts:134` | Mutation | No | No | Ninguna | Ninguno |
| `cleanleaf.dashboard` | `server/routers.ts:142` | Query | No | No | Ninguna | Ninguno (retorna `demoDashboard` hardcodeado) |
| `cleanleaf.reports.list` | `server/routers.ts:144` | Query | Zod (`search`, `predio`, `satellite`, `status`) | No | Ninguna | `shared/report-catalog.ts` (Mock) |
| `cleanleaf.reports.getById` | `server/routers.ts:145` | Query | Zod (`id`) | No | Ninguna | `shared/report-catalog.ts` (Mock) |
| `cleanleaf.catalog` | `server/routers.ts:147` | Query | Zod (`vertical`) | No | Ninguna | `shared/satellite-catalog.ts` |
| `cleanleaf.configStatus` | `server/routers.ts:151` | Query | Zod (`vertical`) | No | Ninguna | `shared/satellite-catalog.ts` |
| `cleanleaf.resources` | `server/routers.ts:152` | Query | Zod (`sector`) | No | Ninguna | `shared/copernicus-catalog.ts` |
| `cleanleaf.createAnalysis` | `server/routers.ts:153` | Mutation | Zod (`analysisInput`) | No | Ninguna | `MockCopernicusProvider` |
| `apiV1.health` | `server/routers.ts:156` | Query | No | No | Ninguna | Ninguno |
| `apiV1.solicitudes.create` | `server/routers.ts:158` | Mutation | Zod (`analysisInput`) | No | Ninguna | `MockCopernicusProvider` |
| `apiV1.onboarding.createTenant`| `server/routers.ts:167` | Mutation | Zod (`organizationName`, `planId`) | No | Ninguna | Ninguno (retorna stub) |
| `apiV1.apiKeys.create` | `server/routers.ts:173` | Mutation | Zod (`tenantId`, `nombre`) | No | Ninguna | Ninguno (retorna stub) |

### e) Diagrama de Flujo de Datos (Análisis de Extremo a Extremo)
1. **Clic del Usuario:** El usuario completa el formulario en `client/src/components/SolicitudAnalisisForm.tsx:112` y hace clic en "Crear solicitud de análisis".
2. **Ruta Cliente:** Invocación del hook tRPC `trpc.cleanleaf.createAnalysis.useMutation()` (`client/src/components/SolicitudAnalisisForm.tsx:32`).
3. **Endpoint Backend:** Servidor Express captura la petición tRPC HTTP POST en `/api/trpc/cleanleaf.createAnalysis` (`server/_core/index.ts:38`), derivando a `appRouter` (`server/routers.ts:153`).
4. **Validación y Lógica:**
   - Se validan parámetros con Zod (`server/routers.ts:51-64`).
   - Se valida el catálogo por vertical (`shared/satellite-catalog.ts:31`).
   - Se valida límite de plan (`shared/plan-limits.ts:16`).
   - Se calcula el tier (`shared/satellite-router.ts:8`).
5. **Fuente Externa:** **SE ROMPE AQUÍ.** En lugar de llamar a CDSE o Open-Meteo, invoca `observationProvider.query()` (`server/routers.ts:107`), que ejecuta `MockCopernicusProvider.query()` (`shared/observation-provider.ts:16`), llamando a `querySentinel()` (`shared/satellite-service.ts:60`), el cual genera un número usando un *hash* determinista de string en memoria (`shared/satellite-service.ts:31-38`).
6. **Almacenamiento:** No toca PostgreSQL ni MySQL. Guarda el resultado en un mapa de memoria JS `idempotencyStore` (`server/routers.ts:67`).
7. **Respuesta y Pantalla:** Devuelve el objeto `AnalysisReport` al cliente, el cual cierra el modal de diálogo en la UI (`client/src/components/SolicitudAnalisisForm.tsx:40`).
8. **Exportación:** **SE ROMPE AQUÍ.** El usuario hace clic en "Exportar PDF" en `client/src/components/ReportDownloadActions.tsx:15`, ejecutando `toast.success("Iniciando descarga de PDF...")` sin generar archivo.

### f) Base de Datos: Tablas, RLS y Uso de Código
- **Tablas en Drizzle / MySQL (`drizzle/schema.ts`):**
  - `users`: Ningún archivo de rutas API o tRPC consulta o escribe en esta tabla en runtime.
- **Tablas en Supabase / Postgres (`supabase/schema.sql`):**
  - `tenants`, `planes`, `users`, `predios`, `suscripciones`, `solicitudes_analisis`, `informes`, `mediciones`, `consumo`, `alertas`, `api_keys`, `workflow_logs`.
- **Políticas RLS:** Todas implementadas en `supabase/schema.sql:162-173` aislando por `get_current_tenant_id()`.
- **Uso en Código:** **NINGÚN CÓDIGO DEL REPO USA ESTAS TABLAS EN RUNTIME.** No existe cliente Supabase `@supabase/supabase-js` en `package.json` ni consultas SQL activas en `server/routers.ts`.

### g) Variables de Entorno
| Nombre Variable | Archivo(s) donde se lee | ¿Obligatoria en runtime? | Compara con `.env.example` |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `server/_core/env.ts:6`, `index.ts:42`, `vite.ts:43`, `vite.config.ts:108` | No (default: `"development"`) | Presente |
| `PORT` | `server/_core/index.ts:50` | No (default: `3000`, busca disponible) | Presente |
| `DATABASE_URL` | `server/_core/env.ts:8`, `server/db.ts:6`, `drizzle.config.ts:7` | Sí para Drizzle (si se conecta DB) | Presente |
| `JWT_SECRET` | `server/_core/env.ts:7` | Sí en prod (si se valida auth) | Presente |
| `OWNER_OPEN_ID` | `server/_core/env.ts:9` | No | Presente |
| `OAUTH_SERVER_URL` | `server/_core/env.ts:10` | No (Auth Manus) | Presente |
| `VITE_APP_ID` | `server/_core/env.ts:11`, `client/src/const.ts:15` | No | Presente |
| `VITE_OAUTH_PORTAL_URL` | `client/src/const.ts:15` | No | Presente |
| `BUILT_IN_FORGE_API_KEY` | `server/_core/env.ts:12` | No | Presente |
| `BUILT_IN_FORGE_API_URL` | `server/_core/env.ts:13` | No | Presente |
| `VITE_FRONTEND_FORGE_API_KEY`| `client/src/components/Map.tsx:18` | No | No en `.env.example` |
| `VITE_FRONTEND_FORGE_API_URL`| `client/src/components/Map.tsx:18` | No | No en `.env.example` |

*Nota:* `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` **no están declaradas ni se leen en ningún archivo del código fuente**.

---

## PARTE 2. INVENTARIO DE COPERNICUS (Solo lo que está en el repo)

### Estado Real de Misiones y Productos

| Satélite / Producto | En el código (Sí/No) | Nivel Alcanzado | Archivo:Línea | Limitación Real |
| :--- | :--- | :--- | :--- | :--- |
| **Sentinel-2 L2A** | Sí | CONECTADO | `shared/satellite-catalog.ts:7`, `shared/satellite-service.ts:52` | No lee bandas (B2-B12/SCL). Calcula NDVI/EVI/NDWI simulando con hash en `satellite-service.ts:31`. |
| **Sentinel-1 GRD/SAR**| Sí | CONECTADO | `shared/satellite-catalog.ts:15`, `shared/satellite-service.ts:48` | Declara Sigma0 VV y VH en dB. No hay preprocesado radar, calibración ni ángulo de incidencia. Simulada. |
| **Sentinel-3 OLCI/SLSTR**| Sí | CONECTADO | `shared/satellite-catalog.ts:22`, `shared/satellite-service.ts:56` | Declara SST (temperatura marina) y Clorofila-a. Solo disponible si vertical es `acuicultura`. Simulada. |
| **Sentinel-5P** | No | NO EXISTE EN EL REPO | - | Mencionado en docs generalistas, no en código. |
| **Sentinel-6** | No | NO EXISTE EN EL REPO | - | No existe en código. |
| **Copernicus DEM** | No | NO EXISTE EN EL REPO | - | No existe en código. |
| **CLMS / CMEMS / CEMS / CDS / CAMS** | Sí | DECLARADO | `shared/copernicus-catalog.ts:18-87` | Declarados como metadatos en catálogo UI. `enabled: false` (salvo CDSE Statistical, que apunta a mock). |

### Acceso Real a CDSE
- **Cliente HTTP:** No existe ningún cliente Axios/Fetch en `server/` o `shared/` que realice peticiones a CDSE.
- **URL Base Declarada:** `"https://dataspace.copernicus.eu/"` en `shared/copernicus-catalog.ts:29`.
- **Flujo de Autenticación:** NO EXISTE en el código. No hay OAuth2 token request a `identity.dataspace.copernicus.eu`.
- **Nivel de Datos Devueltos:** **VALORES SIMULADOS.** Los índices (NDVI, Sigma0, SST) no corresponden a píxeles ni estadísticas reales de polígonos. Se calculan usando un algoritmo de dispersión determinista basado en caracteres del nombre del predio:
  ```typescript
  // shared/satellite-service.ts:31-38
  function stableValue(seed: string, min: number, max: number): number {
    const hash = Array.from(seed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10_000, 17);
    return Number((min + (hash / 10_000) * (max - min)).toFixed(2));
  }
  ```

---

### POTENCIAL (No existe aún)

Para llevar la plataforma a un nivel comercial competitivo utilizando la infraestructura oficial de Copernicus Data Space Ecosystem (CDSE), se podrían incorporar las siguientes capacidades:

1. **Sentinel-2 L2A vía Statistical API (CDSE):**
   - **Utilidad:** Cálculo exacto por polígono (GeoJSON) de NDVI, NDRE, EVI, NDMI y masking de nubes usando la banda SCL (*Scene Classification Layer*).
   - **Requerimientos:** Implementar cliente HTTP OAuth2 en Node.js, constructor de evalscript en Javascript/Processing API y llamadas a `https://sh.dataspace.copernicus.eu/api/v1/statistics`.
   - **Cuota/Costo:** Gratuito en CDSE bajo cuota estándar de procesamiento (procesamiento diferido o quincenal).

2. **Sentinel-1 RTC (Radiometric Terrain Corrected) GRD:**
   - **Utilidad:** Monitoreo continuo de humedad de suelo y estructura de vegetación en zonas con alta nubosidad persistente (ej. Sur de Chile).
   - **Requerimientos:** Procesar retrodifusión Sigma0 (VV/VH) mediante Sentinel Hub Process API / Statistical API con ortorrectificación digital del terreno (DEM).
   - **Cuota/Costo:** Incluido en la cuota gratuita de CDSE.

3. **Copernicus Climate Data Store (CDS / ERA5 Reanalysis):**
   - **Utilidad:** Datos agrometeorológicos históricos y en tiempo real (evapotranspiración $ET_0$, temperatura a 2m, precipitación acumulada y humedad del suelo por capas).
   - **Requerimientos:** Integración con la API CDS (`cdsapirc` o REST Client) de ECMWF (`https://cds.climate.copernicus.eu/`).
   - **Cuota/Costo:** Acceso abierto y gratuito.

---

## PARTE 3. COMPARATIVO CON SAT2FARM

| Función Sat2Farm | Nivel Alcanzado | Evidencia | Qué Falta Concretamente |
| :--- | :--- | :--- | :--- |
| **1. Land Area Mapping** | CODIFICADO | `client/src/components/Map.tsx:18`, `shared/satellite-router.ts:8` | Un dibujador activo de polígonos GeoJSON (Leaflet/Mapbox) e importador KML/SHP/GeoJSON. |
| **2. Soil Nutrient Deficiency (N, P, K, SOC, pH)** | DECLARADO | `shared/copernicus-catalog.ts:25` | Modelos de regresión/índices ópticos (ej. NDRE, REIP) e integración con muestreos de suelo. |
| **3. Pronóstico 15 días** | DECLARADO | `shared/copernicus-catalog.ts:73` | Conexión con Open-Meteo o ECMWF CDS. |
| **4. Calendario de cultivo por ubicación** | DECLARADO | `shared/satellite-catalog.ts:31` | Tabla/Lógica de fenología por cultivo y cálculo de Grados Día Desarrollo (GDD). |
| **5. Humedad de suelo por microondas** | CONECTADO | `shared/satellite-catalog.ts:17`, `shared/satellite-service.ts:48` | Mapeo raster real de humedad y calibración de retrodifusión radar sobre el polígono. |
| **6. Alerta de plagas y enfermedades** | DECLARADO | `shared/report-catalog.ts:34` | Algoritmo agronómico de riesgo basado en curva de humedad y temperatura. |
| **7. Salud del cultivo NDVI** | PROBADO | `server/satellite-domain.test.ts:68`, `shared/satellite-service.ts:52` | Procesamiento de escenas reales L2A y filtro de nubes SCL. |
| **8. Diagnóstico de plagas por imagen** | NO EXISTE | Sin coincidencias en repositorio. | Módulo de visión por computadora / IA generativa multimodal para fotos de hojas. |
| **9. Asesoría de riego** | CODIFICADO | `shared/interpretation.ts:23-29` | Balance hídrico real ($ET_c = ET_0 \times K_c$), tipo de suelo y milímetros recomendados. |
| **10. LSWI (Land Surface Water Index)** | DECLARADO | `shared/copernicus-catalog.ts:25` | Cálculo de banda B8 (NIR) y B11/B12 (SWIR) en evalscript de Sentinel-2. |
| **11. Portal admin / partner** | DECLARADO | `shared/plan-limits.ts:16` | Panel de gestión de usuarios, bloqueo de predios y pagos (Stripe/Webpay). |
| **12. App móvil / PWA & Alertas** | DECLARADO | `client/src/components/DashboardLayout.tsx:102` | Manifest PWA, Service Worker, y Web Push Notifications. |

**Extras:**
- **Multi-idioma:** No existe (100% en español hardcodeado).
- **Unidades locales:** Parcial (soporta Hectáreas `ha`).
- **Soporte multi-cultivo:** 3 sectores definidos en código (`agricultura`, `acuicultura`, `forestal` en `shared/satellite-catalog.ts:31`). No existen cultivos específicos definidos (ej. maíz, trigo, cerezos).

### Tabla Resumen y Estimación de Cercanía a Sat2Farm

| Función | Estimación de Cercanía | Justificación con Evidencia |
| :--- | :--- | :--- |
| Mapping & Polígonos | **Parcial** | Recibe hectáreas y valida tiers (`satellite-router.ts:8`), pero el mapa es estático/iframe. |
| Nutrientes de Suelo | **Cero** | Solo texto en catálogo (`copernicus-catalog.ts:25`); no calcula nitrógeno ni materia orgánica. |
| Pronóstico 15 días | **Cero** | Mencionados en catálogo CDS (`copernicus-catalog.ts:73`); sin peticiones a APIs meteorológicas. |
| Calendario de Cultivo | **Cero** | Filtra satélites por sector (`satellite-catalog.ts:31`), no por especie ni etapa fenológica. |
| Humedad por Microondas | **Parcial** | Genera valores Sigma0 VV en dB (`satellite-service.ts:48`), pero son datos simulados en memoria. |
| Alertas de Plagas | **Parcial** | Genera texto estático de atención en alertas (`report-catalog.ts:34`); falta modelo epidemiológico. |
| Salud del Cultivo NDVI | **Comparable (en UX)** / **Parcial (en Datos)** | Gráficos y flujo completo en UI (`Home.tsx:173`), pero datos simulados con *hash*. |
| Diagnóstico por Imagen | **Cero** | No existe código ni interfaz para carga de fotografías de campo. |
| Asesoría de Riego | **Parcial** | Regla heurística de texto según NDVI/Sigma0 (`interpretation.ts:23`); sin balance hídrico mm/día. |
| LSWI | **Cero** | Declarado en catálogo; sin fórmula de bandas SWIR implementada. |
| Portal Admin / Partner | **Parcial** | Reglas de límites de plan codificadas (`plan-limits.ts:16`); sin UI de administración multi-tenant. |
| App Móvil / PWA | **Parcial** | Layout responsivo móvil (`useMobile.tsx`), pero sin PWA manifest ni Service Worker. |

---

## PARTE 4. ¿FUNCIONA EN RENDER?

### a) Archivos de Despliegue Presentes
- **Archivos en Raíz:** **NO EXISTEN** `render.yaml`, `vercel.json` ni `Dockerfile`.
- **Comandos en `package.json`:**
  - Build: `vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
  - Start: `NODE_ENV=production node dist/index.js`
- **Puerto:** `process.env.PORT` (con *fallback* dinámico desde `3000` en `server/_core/index.ts:50`).

### b) Verificación HTTP contra Render (`https://cleanleafsatelites.onrender.com/`)
Respuestas obtenidas mediante ejecuciones reales de `curl -sI` (almacenadas en `docs/audit/logs/`):

1. **Raíz (`/`):** `HTTP/2 200`
   - `server: cloudflare`
   - `x-powered-by: Express`
   - `x-render-origin-server: Render`
   - `content-type: text/html; charset=UTF-8`
2. **API Health (`/api/health`):** `HTTP/2 200`
   - `content-type: text/html; charset=UTF-8` (Atendido por el *fallback* SPA estático).
3. **Ruta Frontend (`/dashboard`):** `HTTP/2 200`
   - `content-type: text/html; charset=UTF-8`
4. **Ruta Frontend (`/login`):** `HTTP/2 200`
   - `content-type: text/html; charset=UTF-8`

### c) Proceso de Hosting y Enrutado SPA
- **Proceso Único:** El servidor Express (`server/_core/index.ts`) sirve tanto la API tRPC (`/api/trpc`) como los archivos estáticos en producción (`dist/public`).
- **SPA Fallback:** Correctamente configurado en `server/_core/vite.ts:55-58`:
  ```typescript
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  ```
  Esto garantiza que recargar la página en rutas profundas como `/dashboard/informes` retorne `index.html` con HTTP 200.

### d) Riesgos de Render según el Código
1. **Inactividad Plan Gratuito (Spin-down):** Render congela la instancia tras 15 minutos sin tráfico. La primera petición subsiguiente tarda entre 30 y 50 segundos en responder.
2. **Estado en Memoria:** Las solicitudes (`idempotencyStore` en `server/routers.ts:67`) se almacenan en un `Map` en memoria JS. Se borran por completo cada vez que el servidor se reinicia o entra en suspensión.
3. **Timeouts HTTP:** El servidor no utiliza trabajadores en segundo plano (*background workers*). Procesar análisis síncronos sobre peticiones HTTP tRPC arriesga agotar el tiempo límite (timeout de 30s de Render).

### e) Flujo Mínimo de Usuario
- **Paso 1: Registro / Login:** Salteado en UI (`useAuth` retorna usuario mock si no hay sesión).
- **Paso 2: Crear Predio:** Se ingrese en el formulario (`client/src/components/SolicitudAnalisisForm.tsx`).
- **Paso 3: Pedir Análisis:** Se envía a `/api/trpc/cleanleaf.createAnalysis`.
- **Paso 4: Ver Resultado:** La UI muestra el resultado exitoso en pantalla.
- **Punto de Corte Real:** **Paso 3-4 en Producción Real.** Si bien la UI concluye "exitosamente", el análisis **nunca consultó satélites reales ni guardó registros en base de datos**.

### f) Variables Faltantes en Render
Deducidas del código para funcionamiento real:
- `DATABASE_URL` (Para persistencia Drizzle/PostgreSQL).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Para cliente Supabase).
- `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` (Para integración CDSE).
- `JWT_SECRET` (Para firma de tokens en producción).

---

## PARTE 5. DATOS SIMULADOS Y DEUDA TÉCNICA

### Ubicaciones de Datos Simulados y Mocks en el Código

| Archivo:Línea | Descripción del Mock / Fallback | Guard de Producción |
| :--- | :--- | :--- |
| `server/routers.ts:25-49` | `demoDashboard` con predios hardcodeados ("Las Quinas", "El Aromo"). | No (Se sirve incondicionalmente en `cleanleaf.dashboard`). |
| `shared/observation-provider.ts:16` | `MockCopernicusProvider` genera mediciones simuladas. | No (Es la implementación por defecto en `routers.ts:68`). |
| `shared/satellite-service.ts:31-38` | `stableValue()` utiliza hashing estático para simular valores de mediciones. | No. |
| `shared/report-catalog.ts:18-38` | Catálogo de informes pre-generados de demostración. | No. |
| `client/src/_core/hooks/useAuth.ts:13-38` | Mock de usuario autenticado cuando falla o no existe servidor OAuth. | No. |
| `server/_core/sdk.ts:40-45` | Fallback a usuario admin ficticio cuando falla la BD Drizzle/MySQL. | No. |

### Auditoría de Módulos Aislados
Se ejecutó un script de verificación de referencias sobre todos los módulos en `shared/`.
**Resultado:** **0 MÓDULOS AISLADOS.** Todos los archivos en `shared/` son importados por al menos una página de la UI (`client/src/`) o ruta del servidor (`server/`).

### Auditoría de la Suite de Tests
- **Archivos de Test:** 2 archivos (`server/satellite-domain.test.ts` y `server/auth.logout.test.ts`).
- **Total de Pruebas:** 16 pruebas unitarias e integración de routers tRPC.
- **Dependencia de Red:** **0 tests dependen de la red.** El 100% prueba funciones puras, validaciones Zod, límites de planes y llamadas locales al router tRPC.

---

## ANEXO: LOGS DE EJECUCIÓN

### 1. Salida de Curl contra Render
```
HTTP/2 200
date: Fri, 09 Oct 2026 17:17:31 GMT
content-type: text/html; charset=UTF-8
cache-control: public, max-age=0
etag: W/"59d12-1a1217e3e20"
last-modified: Fri, 09 Oct 2026 16:28:04 GMT
rndr-id: 5e22c858-12ad-49c4
server: cloudflare
x-powered-by: Express
x-render-origin-server: Render
```

### 2. Verificación de Inexistencia de Clientes CDSE en Código
```bash
grep -rn "dataspace.copernicus.eu" shared/ server/ client/
# Resultado:
# shared/copernicus-catalog.ts:29:    endpointOficial: "https://dataspace.copernicus.eu/",
```

---

## SECCIÓN FINAL: NO VERIFICADO / BLOCKED

| Elemento / Capacidad | Estado | Motivo Exacto |
| :--- | :--- | :--- |
| **Conexión Live a CDSE API** | BLOCKED | No existen credenciales `COPERNICUS_CLIENT_ID`/`SECRET` ni código cliente HTTP implementado en el repositorio. |
| **Persistencia PostgreSQL / Supabase en Render** | BLOCKED | `DATABASE_URL` no está presente en el entorno de Render y la base de datos no está provisionada en remoto. |
| **Ejecución de `vitest` en Sandbox local** | BLOCKED | Los binarios de `node_modules` no están instalados en el entorno de ejecución actual del agente (`vitest: not found`). |
