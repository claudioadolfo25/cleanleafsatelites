# DIAGNÓSTICO TÉCNICO AGROPULSO
**Fecha:** Septiembre 2024
**Commit analizado:** `c503d4b661f38e88e54869ad98cded6313352258`
**Branch:** `fix/architecture-corrections-v1`

---

## 1. RESUMEN EJECUTIVO

El proyecto **AgroPulso / Cleanleaf MVP v8.0** ha evolucionado de un prototipo visual cliente hacia una plataforma SaaS B2B2C completa y desacoplada con backend funcional tRPC/Express, persistencia multi-tenant en Supabase Postgres y MySQL/Drizzle, y la arquitectura estructural del Agente IA **44.05** con motor de confianza determinístico auditable.

Tras la refactorización arquitectónica de las Fases 1 a 6 y la implementación de la capa de servicios abstractos (Sprint 2), el proyecto resuelve las incompatibilidades históricas de despliegue en Vercel separando el frontend estático SPA (`dist/public`) del servidor de backend de larga duración (`dist/server/index.js`), eliminando la pérdida de estado en memoria al migrar la idempotencia a la tabla `solicitudes_analisis` de Supabase Postgres.

El sistema se encuentra en un estado funcional del 100% con proveedores en modo mock (satélite, clima y LLM), permitiendo ejecutar las 6 fases del ciclo agrícola (Fase 0 a Fase 5) con datos de demostración y simulaciones sin requerir credenciales externas. El código cuenta con una suite de 32 pruebas automáticas en verde y compilación estática limpia en TypeScript (`pnpm check`).

---

## 2. ESTRUCTURA DEL REPOSITORIO

```
agropulso-cleanleaf/
├── client/                      # Frontend SPA (Vite + React 19 + Tailwind CSS + Wouter)
│   ├── public/                  # Assets estáticos y favicon
│   ├── src/
│   │   ├── _core/               # Hooks de autenticación (useAuth)
│   │   ├── components/          # Componentes de UI (Map, SolicitudAnalisisForm, AIChatBox)
│   │   ├── contexts/            # Contextos de React
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Utilidades tRPC y clientes
│   │   ├── pages/               # Páginas (Home, ReportDetail, ReportsDashboard, GuideInterpreterPage)
│   │   ├── App.tsx              # Ruteador principal Wouter y layout
│   │   ├── const.ts             # Constantes cliente
│   │   ├── main.tsx             # Punto de entrada de React con tRPC Provider
│   │   └── index.css            # Estilos globales Tailwind CSS
│   ├── index.html               # Plantilla HTML
│   └── tsconfig.json            # Configuración TypeScript exclusiva cliente (DOM)
├── drizzle/                     # Configuración y Esquema ORM
│   ├── meta/                    # Snapshots e historial Drizzle
│   ├── 0000_steep_banshee.sql   # Migración inicial
│   ├── relations.ts             # Definición de relaciones
│   └── schema.ts                # Tablas AgroPulso (parcelas, temporadas, analisisSuelo, labores, alertas, agenteMensajes, aprendizaje)
├── server/                      # Backend API (Node.js + Express + tRPC)
│   ├── _core/                   # Contexto tRPC, SDKs, servidor HTTP, auth, heartbeat, cookies
│   ├── agent/                   # Agente 44.05
│   │   ├── agent.ts             # Orquestador `runAgent`
│   │   ├── system-prompt.ts     # Generador dinámico `buildSystemPrompt`
│   │   ├── tool-executor.ts     # Ejecutor de herramientas `executeTool`
│   │   ├── tools.ts             # Definición JSON de las 7 herramientas
│   │   └── types.ts             # Interfaces TypeScript del agente
│   ├── services/                # Servicios Abstractos de Integración
│   │   ├── confidence.ts        # Motor determinístico de confianza `calcularConfianza`
│   │   ├── llm.ts               # Interfaz `LLMService` + `MockLLMService`
│   │   ├── satellite.ts         # Interfaz `SatelliteService` + `MockSatelliteService`
│   │   └── weather.ts           # Interfaz `WeatherService` + `MockWeatherService`
│   ├── auth.logout.test.ts      # Test unitario de cierre de sesión
│   ├── confidence.test.ts       # Suite unitaria del motor de confianza (4 tests)
│   ├── db.ts                    # Conexión Drizzle/MySQL
│   ├── idempotency.ts           # Persistencia de idempotencia en Supabase Postgres
│   ├── routers.ts               # Definición de procedimientos tRPC (AgroPulso, cleanleaf, apiV1)
│   ├── satellite-domain.test.ts # Suite de dominio satelital (27 tests)
│   ├── seed.ts                  # Script de seed de datos demo
│   ├── storage.ts               # Helper de almacenamiento de objetos
│   └── tsconfig.json            # Configuración TypeScript exclusiva servidor (Node.js)
├── shared/                      # Código y Lógica Compartida
│   ├── _core/                   # Errores compartidos
│   ├── analysis-state.ts        # Máquina de estados de análisis
│   ├── analysis-validation.ts   # Validación de combinaciones satélite/variable
│   ├── copernicus-catalog.ts    # Catálogo de recursos Copernicus multi-sector
│   ├── interpretation.ts        # Prompts e interpretación
│   ├── observation-provider.ts  # Proveedor mock Copernicus
│   ├── plan-limits.ts           # Límites por plan y superficie
│   ├── report-catalog.ts        # Catálogo de informes mock
│   ├── satellite-catalog.ts     # Catálogo satelital y políticas fail-safe
│   ├── satellite-guidance.ts    # Guías de selección satelital
│   ├── satellite-router.ts      # Motor de enrutamiento por superficie (Tiers 1, 2, 3)
│   ├── satellite-service.ts     # Stubs unificados de Sentinel-1/2/3
│   └── types.ts                 # Tipos compartidos
├── supabase/                    # Esquema objetivo Postgres con RLS
│   ├── schema.sql               # Esquema de tablas multi-tenant, JWT RLS y triggers
│   └── seed.sql                 # Datos de prueba para Supabase
├── .env.example                 # Plantilla de variables de entorno separadas
├── ARCHITECTURE_AUDIT_REPORT.md # Informe de auditoría de Vercel
├── Dockerfile                   # Dockerfile multi-stage para desplegar backend en PaaS
├── IMPLEMENTATION_REPORT.md     # Informe de ejecución de arquitectura
├── README.md                    # Documentación general del proyecto
├── VERCEL_DEPLOYMENT_REPORT.md  # Reporte de preparación de despliegue en Vercel
├── drizzle.config.ts            # Configuración Drizzle Kit
├── package.json                 # Dependencias y scripts
├── tsconfig.json                # Configuración base TypeScript
├── vercel.json                  # Configuración estática de Vercel SPA
└── vite.config.ts               # Configuración de build de Vite
```

---

## 3. STACK TECNOLÓGICO

| Capa | Tecnología | Detalle y Estado |
| --- | --- | --- |
| **Frontend** | React 19 + Vite 7 + Wouter | Single Page Application estática en `client/`, empaquetada hacia `dist/public`. |
| **Styling & UI** | Tailwind CSS 4 + Radix UI + Lucide | Componentes de diseño responsive con modo oscuro/claro y accesibilidad. |
| **Backend API** | Express 4 + tRPC 11 | API fuertemente tipada en `server/`, compila hacia `dist/server/index.js`. |
| **Base de Datos Principal** | Supabase Postgres + Drizzle ORM / MySQL | Tabla `solicitudes_analisis` con RLS multi-tenant y esquemas Drizzle en `drizzle/schema.ts`. |
| **Autenticación** | Manus OAuth + Supabase Auth | Sesiones mediante cookies HTTP-only de corta/larga duración e integración JWT. |
| **Agente IA** | Agente 44.05 (`server/agent/`) | Estructura orquestada con `LLMService` (Mock / OpenAI GPT-4o) y 7 herramientas ejecutables. |
| **Servicios Externos** | Abstract Service Layer (`server/services/`) | Interfaces abstractas intercambiables para Copernicus Sentinel Hub, OpenWeather y OpenAI. |
| **Motor de Confianza** | `calcularConfianza` en `server/services/` | Función determinística pura (100% libre de LLM) cubierta por tests automáticos. |
| **Deployment** | Vercel (Frontend) + PaaS Docker (Backend) | Frontend SPA servido en CDN Vercel; Backend servidor continuo con binding `0.0.0.0` y `/health`. |

---

## 4. BASE DE DATOS

### Tablas Definidas en `drizzle/schema.ts` (MySQL/Drizzle)

1. **`users`**:
   * `id` (int, PK, autoincrement)
   * `openId` (varchar 64, unique, notNull)
   * `name` (text), `email` (varchar 320), `loginMethod` (varchar 64)
   * `role` (enum: "user", "admin", default: "user")
   * `createdAt`, `updatedAt`, `lastSignedIn` (timestamps)
2. **`parcelas`**:
   * `id` (varchar 64, PK)
   * `userId` (varchar 64, FK)
   * `nombre` (varchar 255)
   * `poligonoGeojson` (text) — Polígono GeoJSON con coordenadas geográficas.
   * `areaHa` (decimal 10,2) — Superficie calculada en hectáreas.
   * `createdAt` (timestamp)
3. **`temporadas`**:
   * `id` (varchar 64, PK)
   * `parcelaId` (varchar 64, FK)
   * `ciclo` (varchar 64) — ej. "2026-2027"
   * `faseActual` (int, default: 0) — Número de fase (0 a 5).
   * `metaRendimientoTonHa` (decimal 10,2), `rendimientoRealTonHa` (decimal 10,2)
4. **`analisis_suelo`**:
   * `id` (varchar 64, PK)
   * `temporadaId` (varchar 64, FK)
   * `ph` (decimal 4,2), `nKgHa` (decimal 8,2), `pKgHa` (decimal 8,2), `kKgHa` (decimal 8,2), `materiaOrganicaPct` (decimal 5,2)
   * `fechaAnalisis` (date)
5. **`labores`**:
   * `id` (varchar 64, PK)
   * `temporadaId` (varchar 64, FK)
   * `fase` (int) — Fase agrícola (0 a 5).
   * `tipo` (varchar 128) — ej. "siembra", "fertilizacion", "riego", "barbecho"
   * `fecha` (date), `descripcion` (text), `fotoUrl` (text)
6. **`alertas`**:
   * `id` (varchar 64, PK)
   * `temporadaId` (varchar 64, FK)
   * `zona` (varchar 128) — ej. "Zona Norte"
   * `tipo` (varchar 128) — ej. "bajo_vigor", "estres_hidrico"
   * `deteccion` (text), `hipotesisJson` (text), `accionRecomendada` (text)
   * `confianza` (enum: "alto", "medio", "bajo", "no_concluyente")
   * `factoresConfianzaJson` (text)
   * `fechaImagen` (date), `leida` (boolean)
7. **`agente_mensajes`**:
   * `id` (varchar 64, PK)
   * `userId` (varchar 64, FK), `temporadaId` (varchar 64, FK)
   * `rol` (enum: "user", "assistant", "tool")
   * `contenidoJson` (text), `herramientasUsadasJson` (text)
8. **`aprendizaje`**:
   * `id` (varchar 64, PK)
   * `alertaId` (varchar 64, FK)
   * `accionUsuario` (varchar 128) — "seguir", "ignorar", "modificar"
   * `resultado` (text), `fueUtil` (boolean), `datoFaltante` (text)

### Tablas en Supabase Postgres (`supabase/schema.sql`)
Incluye aislamiento RLS por tenant (`get_current_tenant_id()`), índices únicos `uq_solicitudes_tenant_idempotency` sobre `(tenant_id, idempotency_key)` y columna `resultado_json` para almacenar respuestas procesadas.

---

## 5. FUNCIONALIDADES DEL FRONTEND

| Ruta URL | Componente Principal | Datos Consumidos | Interacciones Disponibles | Estado |
| --- | --- | --- | --- | --- |
| `/` | `client/src/pages/Home.tsx` | Demo Dashboard (`trpc.cleanleaf.dashboard`) | Vista general, métricas de cultivo, navegación a secciones | ✅ Completo |
| `/dashboard/informes` | `client/src/pages/ReportsDashboard.tsx` | Lista de informes (`trpc.cleanleaf.reports.list`) | Filtros por estado, satélite y búsqueda; tarjetas con barra de progreso 0-100% | ✅ Completo |
| `/dashboard/informes/:id` | `client/src/pages/ReportDetail.tsx` | Detalle de informe (`trpc.cleanleaf.reports.getById`) | Trazabilidad paso a paso, métricas de vigor, descarga de PDF/GeoJSON sim. | ✅ Completo |
| `/dashboard/guias/interpretar-informes` | `client/src/pages/GuideInterpreterPage.tsx` | Catálogo de interpretación y glosario satelital | Asistente interactivo Dify AI mock, carga de archivos, filtro de glosario | ✅ Completo |
| `/dashboard/configuracion/satelites` | `client/src/pages/Home.tsx` (sección) | Catálogo de satélites (`trpc.cleanleaf.catalog`) | Habilitación de fuentes, diagnóstico fail-safe por vertical | ✅ Completo |
| `/app/agente` | `client/src/components/AIChatBox.tsx` | Endpoint tRPC `trpc.agente.chat` | Chat completo con Agente 44.05, inyección de contexto y despliegue de herramientas | ✅ Completo |

---

## 6. AGENTE 44.05

* **Endpoint del Agente:** Procedimiento tRPC `agente.chat` en `server/routers.ts`.
* **System Prompt:** Implementado en `server/agent/system-prompt.ts` vía `buildSystemPrompt(contexto)`. Define la personalidad de mentor, prohíbe la prescripción directa de dosis, exige la estructura *Detección → Hipótesis → Acción → Confianza → Factores* y adopta español mexicano técnico agrícola.
* **Herramientas (7/7 Implementadas en JSON y Ejecutor):**
  1. `consultar_parcela`: Obtiene coordenadas, polígono y área.
  2. `consultar_indices_satelitales`: Consulta serie de tiempo de NDVI/NDRE.
  3. `consultar_clima`: Obtiene precipitación y temperaturas.
  4. `consultar_labores`: Retorna historial de labores agrícolas de la temporada.
  5. `consultar_analisis_suelo`: Retorna valores de laboratorio (pH, N, P, K, MO).
  6. `calcular_confianza`: Llama a la función determinística pura `calcularConfianza()`.
  7. `registrar_accion`: Registra la respuesta/aprendizaje del agricultor.
* **Motor de Confianza (`server/services/confidence.ts`):**
  * **100% Determinístico:** Evaluación basada en número de observaciones válidas, nubosidad promedio, días desde la última toma y consistencia de tendencia.
  * **Reglas:**
    * *Alto:* ≥3 observaciones en 15 días, nubosidad <20%, tendencia consistente.
    * *Medio:* 2 observaciones en 21 días, nubosidad <35%.
    * *Bajo:* 1 observación, nubosidad ≥50% o imagen >21 días antigua.
    * *No concluyente:* Tendencia contradictoria o 0 observaciones.
* **Orquestación:** En `server/agent/agent.ts` mediante `runAgent(input)`. Inyecta el contexto de la parcela, ejecuta herramientas mediante `executeTool` y retorna el payload estructurado.

---

## 7. INTEGRACIONES EXTERNAS

Se creó una capa de **Servicios Abstractos (Abstract Service Layer)** en `server/services/` que desacopla la lógica de negocio de los proveedores reales:

1. **Satélite (`server/services/satellite.ts`):**
   * Interface: `SatelliteService` (`getNDVI`, `getNDRE`, `getSoilMoistureTrend`).
   * Implementación actual: `MockSatelliteService`.
   * Cambio a real: Modificar `SATELLITE_PROVIDER=sentinelhub` y configurar credenciales en `.env`.
2. **Clima (`server/services/weather.ts`):**
   * Interface: `WeatherService` (`getRecentWeather`).
   * Implementación actual: `MockWeatherService`.
   * Cambio a real: Modificar `WEATHER_PROVIDER=openweather` y configurar `OPENWEATHER_API_KEY`.
3. **LLM (`server/services/llm.ts`):**
   * Interface: `LLMService` (`chat`).
   * Implementación actual: `MockLLMService`.
   * Cambio a real: Modificar `LLM_PROVIDER=openai` y configurar `OPENAI_API_KEY` (usando GPT-4o).

---

## 8. DATOS DEMO

El script `server/seed.ts` genera automáticamente un conjunto de datos realista y completo para demostraciones:

* **Usuario Demo:** Don Ernesto Cruz (`demo-user-jalisco`).
* **Parcela Demo:** "Lote 3 Norte - Maíz Híbrido" (45.5 ha) con polígono GeoJSON de Jalisco, México.
* **Temporada Demo:** Ciclo "2026-2027" en Fase 4 (Manejo de Cultivo).
* **Análisis de Suelo:** pH 5.8, N: 22.4 kg/ha, P: 12.1 kg/ha (bajo), K: 180.5 kg/ha, MO: 1.2%.
* **Alertas Satelitales:** 3 alertas generadas con el motor de confianza determinístico:
  * `alt-101`: Bajo vigor en Zona Norte (Nivel: **Alto**).
  * `alt-102`: Estrés hídrico en Zona Sur (Nivel: **Medio**).
  * `alt-103`: Posible anomalía en Zona Este (Nivel: **Bajo** por nubosidad alta).
* **Labores Registradas:** 5 labores históricas (barbecho, siembra, fertilización V4, monitoreo de plagas, riego de auxilio).

---

## 9. COMPARACIÓN CONTRA BLUEPRINT v4.2

| Sección del Blueprint v4.2 | Estado | Observación / Detalle |
| --- | --- | --- |
| **1. Ciclo de 6 Fases (0 a 5)** | ✅ **Implementado** | Rutas, UI de wizard y procedimientos tRPC habilitados para todas las fases. |
| **2. Motor de confianza auditable** | ✅ **Implementado** | Función determinística pura en `server/services/confidence.ts` con tests automáticos. |
| **3. Agente IA único (44.05)** | ✅ **Implementado** | Agente funcional con system prompt, orquestador y 7 herramientas ejecutables. |
| **4. Integración Copernicus (Sentinel-1/2/3)** | ⚠️ **Parcial** | Catálogo y stubs unificados funcionales; requiere credenciales CDSE para llamadas live. |
| **5. Calculadora de escenarios (Fase 0)** | ⚠️ **Parcial** | Escenarios (conservador/objetivo/alto) integrados en la UI; cálculo real con SIAP/ODEPA pendiente. |
| **6. Mecanismo de aprendizaje (Fase 5)** | ✅ **Implementado** | Tabla `aprendizaje` en esquema Drizzle y procedimiento tRPC `aprendizaje.create`. |
| **7. Arquitectura de servicios abstractos** | ✅ **Implementado** | Factories y contratos abstractos para Satellite, Weather y LLM en `server/services/`. |
| **8. Privacidad y Seguridad de Datos** | ✅ **Implementado** | Políticas RLS multi-tenant en Supabase Postgres y segregación estricta de variables en `.env.example`. |

---

## 10. GAPS CRÍTICOS

### CRÍTICO (Bloqueantes para Producción)
1. **Despliegue del Backend en PaaS:** Desplegar el contenedor de `Dockerfile` en Railway, Render o Fly.io para exponer el endpoint continuo tRPC.
2. **Conexión de Credenciales OpenAI:** Configurar `OPENAI_API_KEY` para activar GPT-4o en `server/services/llm.ts` reemplazando el `MockLLMService`.

### IMPORTANTE (Para Piloto en Campo)
1. **Integración Live con Sentinel Hub / Copernicus CDSE:** Implementar la clase `SentinelHubService` que consuma OAuth2 y entregue polígonos NDVI/NDRE reales.
2. **Dibujo Interactivo de Polígonos en Mapa:** Habilitar la herramienta de dibujo libre (MapLibre Draw) en el frontend para guardar GeoJSONs personalizados en la tabla `parcelas`.

### DESEABLE (Post-Piloto)
1. **Modo Offline PWA:** Implementar Service Worker y almacenamiento IndexedDB para consulta de mapas en zonas de baja cobertura celular.
2. **Integración Live con OpenWeather API:** Activar `OpenWeatherService` para lecturas agroclimáticas en tiempo real.

---

## 11. MÉTRICAS DE CALIDAD

* **Cobertura de Tests (`pnpm test`):**
  * **32 tests ejecutados y pasados al 100%** (3 test files: `confidence.test.ts`, `satellite-domain.test.ts`, `auth.logout.test.ts`).
* **Verificación de Tipos (`pnpm check`):**
  * **0 errores de TypeScript.** Proyectos `client/tsconfig.json` y `server/tsconfig.json` aislados correctamente.
* **Performance de Build (`pnpm build`):**
  * Bundle estático cliente Vite generado en **~8.5s**.
  * Bundle de servidor Node.js esbuild generado en **~20ms** (tamaño de bundle de servidor: 80.9 kB).

---

## 12. RECOMENDACIONES Y PLAN DE ACCIÓN

```
+-----------------------------------------------------------------------------------+
|                            SECUENCIA RECOMENDADA DE ACCIÓN                        |
+-------------------+--------------------------------+------------------------------+
| Paso              | Descripción                    | Complejidad / Dependencia    |
+-------------------+--------------------------------+------------------------------+
| 1. Despliegue PaaS| Levantar Backend en Railway/   | Baja / Requiere cuenta PaaS   |
|                   | Render usando Dockerfile       |                              |
| 2. Connect Vercel | Conectar repo a Vercel con     | Baja / Depende del Paso 1    |
|                   | VITE_API_URL apuntando a PaaS  | (para URL de API)            |
| 3. Activar OpenAI | Agregar OPENAI_API_KEY y       | Baja / Depende de credencial |
|                   | LLM_PROVIDER=openai            |                              |
| 4. Sentinel Live  | Implementar SentinelHubService | Media / Requiere credenciales|
|                   | real con OAuth2 en backend     | Copernicus/Sentinel Hub      |
+-------------------+--------------------------------+------------------------------+
```

1. **Paso 1 (Inmediato):** Conectar el repositorio en el dashboard de Vercel (para el frontend SPA) y en Railway/Render (para el backend con `Dockerfile`).
2. **Paso 2 (Inmediato):** Configurar las variables de entorno en Vercel (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. **Paso 3 (Siguiente Iteración):** Sustituir la fábrica mock de LLM por la llamada real a OpenAI GPT-4o configurando `OPENAI_API_KEY`.
