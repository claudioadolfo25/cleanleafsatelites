# DIAGNÓSTICO TÉCNICO ACTUAL DE AGROPULSO
**Fecha:** Septiembre 2024
**Commit analizado:** `c503d4b661f38e88e54869ad98cded6313352258`
**Branch:** `fix/architecture-corrections-v1`
**Auditor:** Arquitecto de Software Principal y Auditor de Código (Jules)

---

## 1. RESUMEN EJECUTIVO

El repositorio de **AgroPulso / Cleanleaf MVP v8.0** ha completado de forma verificable la reestructuración arquitectónica y la creación de la capa funcional desacoplada. La base de código cuenta con una separación limpia entre el frontend estático SPA (`client/`) y el backend API de servidor continuo (`server/`). Se ha eliminado la dependencia de estado en memoria efímero al conectar la persistencia de idempotencia contra Supabase Postgres.

La arquitectura de servicios abstractos (`server/services/`) está implementada y lista para recibir credenciales de producción. El motor de confianza (`server/services/confidence.ts`) es **100% determinístico y puro**, libre de llamadas a modelos de lenguaje (LLM). El Agente IA **44.05** en `server/agent/` cuenta con su orquestador `runAgent`, generador de prompt con contexto, definiciones JSON de las 7 herramientas y ejecutor funcional.

Actualmente, las llamadas a servicios externos (satélite, clima y LLM) operan mediante **fábricas y clases mock** (`MockSatelliteService`, `MockWeatherService`, `MockLLMService`). Esto permite ejecutar el circuito completo de la aplicación (Fase 0 a Fase 5) de manera local y determinística con cero costo de API. Para pasar a producción, únicamente se requiere implementar los conectores reales (`OpenAIService`, `SentinelHubService`, `OpenWeatherService`) y configurar las variables de entorno en `.env`.

---

## 2. AUDITORÍA POR CAPAS (TABLA DE ESTADO)

| Componente | Estado | Evidencia en Código (Archivo y Líneas Exactas) |
| --- | --- | --- |
| **Servicios Abstractos (Mocks)** | ✅ **Implementado** | `server/services/satellite.ts` (L1-61)<br>`server/services/weather.ts` (L1-37)<br>`server/services/llm.ts` (L1-62) |
| **Motor de Confianza Determinístico** | ✅ **Implementado** | `server/services/confidence.ts` (L1-61 — Función pura `calcularConfianza`) <br>Tests: `server/confidence.test.ts` (4 tests pasando) |
| **Agente 44.05 (Orquestador + 7 tools)** | ✅ **Implementado** | `server/agent/types.ts` (L1-23)<br>`server/agent/system-prompt.ts` (L1-33 — Reglas y formato)<br>`server/agent/tools.ts` (L1-118 — 7 esquemas JSON)<br>`server/agent/tool-executor.ts` (L1-72 — Ejecutor)<br>`server/agent/agent.ts` (L1-57 — Orquestador `runAgent`) |
| **Schema Drizzle (7 tablas)** | ✅ **Implementado** | `drizzle/schema.ts` (L27-133 — Tablas: `parcelas`, `temporadas`, `analisis_suelo`, `labores`, `alertas`, `agente_mensajes`, `aprendizaje`) |
| **Frontend conectado a tRPC (sin mocks hardcodeados)** | ⚠️ **Parcial** | `client/src/main.tsx` (L40-42 — URL `VITE_API_URL`)<br>`client/src/components/SolicitudAnalisisForm.tsx` (L28-31)<br>`client/src/pages/ReportsDashboard.tsx` (L27-29)<br>`client/src/pages/ReportDetail.tsx` (L16)<br>*Nota:* Algunas vistas secundarias aún conservan referencias a `client/src/data/agropulso.ts` como fallback UI. |
| **Persistencia DB de Idempotencia** | ✅ **Implementado** | `server/idempotency.ts` (L1-101 — DB queries en `solicitudes_analisis`)<br>`supabase/schema.sql` (L68 — Índice `uq_solicitudes_tenant_idempotency`) |
| **Aislamiento TypeScript** | ✅ **Implementado** | `client/tsconfig.json` (DOM/Vite)<br>`server/tsconfig.json` (Node/Express) |
| **Servidor Persistente & Docker** | ✅ **Implementado** | `server/_core/index.ts` (L36-53 — `CORS_ORIGIN`, `0.0.0.0`, `/health`)<br>`Dockerfile` (L1-28 — Build multi-stage) |

---

## 3. COMPARATIVA VS BLUEPRINT v4.2

- **Ciclo de 6 Fases (Fase 0 a Fase 5)**: ✅ **Implementado**. Las rutas de la interfaz y los endpoints tRPC correspondientes a cada fase existen y están vinculados en la navegación principal.
- **Integración Copernicus (Stubs vs Real)**: ⚠️ **Parcial**. El catálogo de Copernicus (`shared/copernicus-catalog.ts`), los stubs de Sentinel-1/2/3 (`shared/satellite-service.ts`) y la interfaz `SatelliteService` están completados; falta implementar la clase `SentinelHubService` con autenticación OAuth2 live contra Copernicus CDSE.
- **Calculadora de Escenarios (Fase 0)**: ⚠️ **Parcial**. Los tres escenarios (conservador, objetivo, alto) están integrados en la UI y calculan métricas en el frontend; la integración con tablas de brecha de rendimiento regional (SIAP/ODEPA) está pendiente para la siguiente fase.
- **Mecanismo de Aprendizaje (Fase 5)**: ✅ **Implementado**. La tabla `aprendizaje` está definida en `drizzle/schema.ts` y expuesta vía procedimiento tRPC `aprendizaje.create` en `server/routers.ts`.

---

## 4. GAPS CRÍTICOS PARA EL SPRINT 3 (PRIORIZADOS)

1. **Gap Crítico #1: Conector Real de OpenAI en `server/services/llm.ts`**
   * *Descripción:* Implementar la clase `OpenAIService` que utilice el paquete oficial `openai` o `fetch` hacia la API v1/chat/completions de OpenAI para ejecutar GPT-4o cuando `LLM_PROVIDER=openai` y `OPENAI_API_KEY` estén configurados.
2. **Gap Crítico #2: Conector Real de Copernicus / Sentinel Hub en `server/services/satellite.ts`**
   * *Descripción:* Implementar la clase `SentinelHubService` que obtenga tokens OAuth2 server-side y consulte los endpoints de Processing/Statistical API de Copernicus CDSE para extraer estadísticas NDVI y NDRE reales sobre el polígono GeoJSON.
3. **Gap Crítico #3: Dibujo Interactivo de Polígonos en el Mapa Cliente**
   * *Descripción:* Integrar una herramienta de dibujo libre (MapLibre Draw / Turf.js) en `client/src/components/Map.tsx` para permitir al agricultor delimitar su parcela geográficamente y enviar el GeoJSON a `trpc.parcelas.create`.

---

## 5. RECOMENDACIÓN INMEDIATA

Se recomienda abordar de forma inmediata el **Gap Crítico #1** para habilitar el motor del Agente IA **44.05** con llamadas reales a OpenAI GPT-4o mientras se mantiene el comportamiento seguro de fallback cuando no hay API key presente.

### Prompt Exacto para Ejecutar el Gap Crítico #1:

```markdown
# TAREA: Implementación de OpenAIService para el Agente 44.05

## OBJETIVO
Implementar la integración real con OpenAI GPT-4o en `server/services/llm.ts` manteniendo la arquitectura abstracta existente y el fallback automático a `MockLLMService` cuando no exista `OPENAI_API_KEY`.

## INSTRUCCIONES

1. **Instalación de Dependencia:**
   - Instala el SDK oficial de OpenAI: `pnpm add openai`

2. **Implementación en `server/services/llm.ts`:**
   - Crea e implementa la clase `OpenAIService` que cumpla con la interfaz `LLMService`:
     ```typescript
     export class OpenAIService implements LLMService {
       private client: OpenAI;
       constructor(apiKey: string, private model: string = "gpt-4o") {
         this.client = new OpenAI({ apiKey });
       }
       async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
         // Llamar a this.client.chat.completions.create(...)
         // Formatear la respuesta y devolver content y toolCalls si existen
       }
     }
     ```
   - Actualiza la función fábrica `createLLMService()`:
     ```typescript
     export function createLLMService(): LLMService {
       if (process.env.LLM_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
         return new OpenAIService(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || "gpt-4o");
       }
       return new MockLLMService();
     }
     ```

3. **Verificación y Pruebas:**
   - Asegura que si `OPENAI_API_KEY` no está configurada, el sistema continúe usando `MockLLMService` de forma transparente sin fallar.
   - Ejecuta `pnpm test` y `pnpm check` para confirmar que todas las pruebas pasen y que no existan errores de compilación de TypeScript.
```
