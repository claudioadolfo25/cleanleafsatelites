# Informe de Auditoría de Arquitectura y Compatibilidad con Vercel
**Proyecto:** Cleanleaf MVP v8.0
**Fecha:** Septiembre 2024
**Autor:** Arquitecto Principal de Software / Jules

---

## Resumen Ejecutivo

El proyecto **Cleanleaf MVP v8.0** fue construido inicialmente sobre un patrón acoplado en un único repositorio que combina una SPA cliente (Vite + React + TypeScript en `client/`) y un servidor Node.js/Express monolítico (`server/` + `shared/`) ejecutado con `tsx` / `esbuild`. A pesar de múltiples intentos de adaptación mediante `vercel.json`, `includeFiles`, overrides de tipos de Express y configuraciones Serverless, el despliegue monolítico en Vercel presenta fallas estructurales recurrentes.

El diagnóstico técnico concluye que **intentar empaquetar un servidor Express tradicional completo como una única Serverless Function en Vercel manteniendo un frontend Vite SPA en el mismo proyecto genera una fricción arquitectónica insostenible**. Vercel está optimizado para estáticos SPA o frameworks full-stack unificados (Next.js/SvelteKit), mientras que el backend de Cleanleaf requiere ejecución de larga duración (procesamiento de imágenes satelitales Sentinel/Copernicus, tareas por lotes n8n, pooling de conexiones de BD y endpoints tRPC persistentemente activos).

**Recomendación Principal:** Implementar **Escenario B: Separación de Plataformas (Decoupled Architecture)**.
1. **Frontend (Vite + React SPA):** Desplegado en **Vercel** o **Cloudflare Pages** como activos estáticos globales ultra-rápidos con CDN.
2. **Backend (Express + tRPC API):** Desplegado como un contenedor Node.js de larga duración en una plataforma Cloud PaaS como **Railway**, **Render**, **Fly.io** o **AWS App Runner**.
3. **Persistencia & Datos:** **Supabase Postgres** (con RLS y Auth Hooks) actuando como capa de datos centralizada e independiente.

Esta separación elimina definitivamente los errores de empaquetado de Serverless (`ERR_MODULE_NOT_FOUND`, descalce de tipos Express/Vercel Request, pérdida de estado en memoria/idempotencia) y permite a cada capa escalar de acuerdo a su naturaleza operativa.

---

## 1. Diagnóstico Técnico del Estado Actual

### 1.1. Revisión de Estructura y Configuración

#### Estructura del Repositorio
```
cleanleaf/
├── client/              # Frontend (Vite + React + TS)
│   ├── src/             # Componentes, Hooks, Páginas UI
│   └── index.html       # Entry point SPA
├── server/              # Backend (Express + tRPC)
│   ├── _core/           # Contexto tRPC, SDKs, servidor HTTP, auth, proxy
│   └── routers.ts       # Definición de procedimientos tRPC (cleanleaf, apiV1)
├── shared/              # Código compartido (Lógica de dominio, catálogo satelital, tipos)
│   ├── satellite-catalog.ts
│   ├── satellite-router.ts
│   └── copernicus-catalog.ts
├── supabase/            # Esquema SQL y migraciones
├── package.json         # Configuración pnpm y scripts de build
├── tsconfig.json        # Configuración TypeScript global (moduleResolution: bundler)
└── vite.config.ts       # Build de Vite con outDir dist/public
```

#### Puntos Críticos de Configuración
* **Scripts de Build (`package.json`):**
  `"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"`
  * *Observación:* El comando `vite build` genera estáticos en `dist/public`. Posteriormente, `esbuild` compila el servidor a `dist/index.js`.
  * *Conflicto con Vercel:* Vercel espera detectar o bien una estructura de rutas Serverless estandarizada (`/api/*.ts`) o un proyecto Next.js. El intento de encajar `server/_core/index.ts` dentro de `api/index.ts` o mediante redirecciones en `vercel.json` hace que el bundler interno de Vercel (NFT - Node File Trace) falle al rastrear dependencias dinámicas de `server/**` y `shared/**`.
* **TypeScript & Resolución de Módulos (`tsconfig.json`):**
  Configurado con `"moduleResolution": "bundler"`, `"module": "ESNext"`, y alias de caminos (`@/*` -> `./client/src/*`, `@shared/*` -> `./shared/*`).
  * *Conflicto en Vercel:* Cuando Vercel compila funciones Serverless aisladas, `tsc` o el compilador interno de Vercel evalúa tipos de `express` y `@types/node`. Se han presentado colisiones entre tipos globales de `Response` (DOM Fetch API) y `express.Response` (Node HTTP), derivando en errores como `Property 'json' does not exist on type 'Response'` durante los builds de producción en Vercel.

### 1.2. Análisis del Histórico de Errores en Vercel

1. **`ERR_MODULE_NOT_FOUND` / Missing Dependencies in Serverless Bundle:**
   * *Causa:* Vercel empaqueta cada función bajo `/api` de forma independiente analizando las importaciones estáticas AST. La arquitectura actual importa dinámicamente o referencia mediante rutas relativas archivos en `server/_core` y `shared/`.
   * *Consecuencia:* Al desplegar, Node.js en la función Serverless no encuentra carpetas secundarias o paquetes declarados en `dependencies` que esbuild asumió como `external`.
2. **TypeScript Type Mismatch (`express` vs Fetch API):**
   * *Causa:* La mezcla de entornos client (`dom`, `dom.iterable`) y server (`node`) en un único `tsconfig.json` global provoca que el verificador de tipos de Vercel confunda los objetos `Request`/`Response` de la Web API nativa de Node 20/24 con los objetos req/res de Express.
3. **Incompatibilidad del Modelo Serverless con las Funciones del Backend:**
   * *Procesos de Larga Duración:* El motor de procesamiento satelital (Tiers 1, 2 y 3) y la integración con Copernicus CDSE requieren ejecutar peticiones HTTP pesadas y polling que exceden el tiempo máximo de ejecución de Serverless Functions (10s - 60s en plan Vercel Hobby/Pro).
   * *Estado en Memoria e Idempotencia:* `server/routers.ts` mantiene una `idempotencyStore = new Map<string, unknown>()` en memoria. En un entorno Serverless con instancias efímeras e invocaciones congeladas/destruidas, el almacén en memoria se pierde entre peticiones.

---

## 2. Propuestas de Arquitectura

Evaluamos tres posibles escenarios arquitectónicos para garantizar operatividad, escalabilidad y facilidad de mantenimiento.

```
+-----------------------------------------------------------------------------------+
|                                MATRIZ COMPARATIVA                                 |
+------------------------------------+---------------+---------------+--------------+
| Criterio                           | Escenario A   | Escenario B   | Escenario C  |
|                                    | (Monorepo)    | (Separación)  | (Next.js)    |
+------------------------------------+---------------+---------------+--------------+
| Compatibilidad con Vercel          | Media         | Excelente     | Nativa       |
| Complejidad de Implementación      | Media-Alta    | Baja-Media    | Muy Alta     |
| Soporte Tareas de Larga Duración   | Limitado      | Total (PaaS)  | Limitado     |
| Aislamiento de Entornos/Tipos      | Parcial       | Total         | Integrado    |
| Costo Operativo Inicial            | $0 - $20/mes  | $5 - $15/mes  | $0 - $20/mes |
| Recomendación                      | No sugerido   | RECOMENDADO   | Opcional v9  |
+------------------------------------+---------------+---------------+--------------+
```

---

### 2.1. Escenario A: Mantener Vercel mediante Reorganización Monorepo

Si se insistiera en mantener todo el proyecto alojado exclusivamente en Vercel, la solución requeriría reestructurar el repositorio hacia un **pnpm workspace / monorepo estricto**:

```
cleanleaf-monorepo/
├── apps/
│   ├── web/                     # SPA Frontend (Vite)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vercel.json          # Proyecto Vercel 1 (Static Site)
│   └── api/                     # Backend Serverless API
│       ├── api/
│       │   └── index.ts         # Vercel Serverless Function Handler
│       ├── src/                 # Servidor Express/tRPC
│       ├── package.json
│       ├── tsconfig.json        # Configuración exclusiva para Node/Express
│       └── vercel.json          # Proyecto Vercel 2 (Serverless API)
└── packages/
    └── shared/                  # Módulo compartido de tipos y lógica satelital
        ├── package.json
        └── index.ts
```

#### Ventajas y Desventajas
* **Ventajas:** Mantiene a Vercel como único proveedor de despliegue.
* **Desventajas:**
  * Sigue limitado por el tiempo de ejecución Serverless (máx. 10s-60s per request).
  * No resuelve la pérdida del almacén de idempotencia y caché en memoria.
  * Requiere reconfigurar completamente el proyecto como Monorepo con Turborepo/pnpm.

---

### 2.2. Escenario B: Separación de Plataformas (RECOMENDADO)

La arquitectura óptima para Cleanleaf MVP v8.0 separa el Frontend SPA del Backend Server API, aprovechando las fortalezas específicas de cada infraestructura:

```
                                +---------------------------+
                                |      Usuario / Browser    |
                                +-------------+-------------+
                                              |
                                              | HTTPS / Web
                                              v
                                +---------------------------+
                                |  Vercel / Cloudflare Pages|
                                |  (Frontend: Vite SPA)     |
                                +-------------+-------------+
                                              |
                                              | tRPC / HTTP REST (CORS)
                                              v
                                +---------------------------+
                                |  Railway / Render / Fly   |
                                |  (Backend: Express API)   |
                                +------+--------------+-----+
                                       |              |
                    Consultas Satelitales |              | OAuth2 / Postgres SQL
                                       v              v
                        +------------------+   +-------------------+
                        | Copernicus CDSE  |   | Supabase Postgres |
                        | (Sentinel Hub)   |   | (Auth & RLS DB)   |
                        +------------------+   +-------------------+
```

#### Componentes de la Arquitectura Propuesta

1. **Frontend (Vercel):**
   * **Alcance:** Exclusivamente la carpeta `client/` y assets estáticos.
   * **Build:** `vite build` -> output `dist/public` (o `dist`).
   * **Configuración Vercel (`vercel.json`):**
     ```json
     {
       "framework": "vite",
       "buildCommand": "pnpm --filter client build",
       "outputDirectory": "client/dist",
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
   * **Comunicación:** Variable de entorno `VITE_API_URL=https://api.cleanleaf.cl` apuntando al backend en Railway/Render.

2. **Backend API (Railway / Render / Fly.io / AWS App Runner):**
   * **Alcance:** Carpetas `server/` y `shared/`.
   * **Ejecución:** Proceso Node.js continuo (`node dist/index.js` o `tsx server/_core/index.ts`).
   * **Ventajas Operativas:**
     * Sin límites de tiempo de Serverless per request (permite procesamiento por lotes, webhooks de Copernicus/n8n y streaming).
     * Mantiene conexiones persistentes a la base de datos (Supabase PgBouncer / Connection Pool).
     * `idempotencyStore` y cachés en memoria funcionan de forma confiable.
     * Soporte completo de middleware Express, CORS y Headers HTTP sin restricciones de Vercel.

3. **Base de Datos y Autenticación (Supabase Postgres):**
   * Base de datos Postgres administrada con esquemas RLS multi-tenant (`supabase/schema.sql`).
   * Supabase Auth expone JWT tokens que son validados por el backend en Railway/Render.

#### Por qué esta separación resuelve los problemas del MVP
* **Cero fricción de tipos:** El frontend solo compila assets web (`dom`); el backend solo compila Node.js (`node`).
* **Estabilidad de despliegue:** Cero dependencias faltantes por empaquetado de Serverless.
* **Escalabilidad independiente:** El frontend estático se sirve en Edge CDN gratuitamente o a costo mínimo, mientras que el backend escala horizontalmente según carga de cómputo.

---

### 2.3. Escenario C (Opcional): Migración Full-Stack a Next.js (App Router)

Si el objetivo fuera unificar el proyecto en un solo framework full-stack compatible en un 100% con Vercel de forma nativa, la opción sería refactorizar Cleanleaf hacia **Next.js**:

* **Estructura:**
  * `app/` para Server Components, Client Components y UI (reemplazando Wouter y Vite).
  * `app/api/trpc/[trpc]/route.ts` utilizando `@trpc/server/adapters/fetch` para la API tRPC.
* **Evaluación:**
  * **Pros:** Integración nativa sin fricción con Vercel.
  * **Contras:** Requiere una reescritura masiva de la capa UI (sustituir Wouter por Next Router, migrar hooks, adaptar layout) y sigue condicionado a límites de Serverless para tareas satelitales intensivas. **Se descarta para la versión MVP v8.0.**

---

## 3. Plan de Acción y Migración (Hacia Escenario B)

### Paso 1: Reorganización del Repositorio y Separación de Módulos
1. Configurar un esquema de carpetas limpio o utilizar `pnpm workspaces`:
   * Mover configuraciones cliente a `client/`.
   * Asegurar que `shared/` sea importable tanto en frontend como en backend.
2. Crear un `Dockerfile` en la raíz para el backend API (compatible con Railway, Render o Fly.io):
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   RUN corepack enable && corepack prepare pnpm@latest --activate
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile
   COPY . .
   RUN pnpm build

   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /app/package.json ./
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   EXPOSE 3000
   CMD ["node", "dist/index.js"]
   ```

### Paso 2: Configuración del Frontend en Vercel
1. En el Dashboard de Vercel, conectar el repositorio y seleccionar como Root Directory: `./` (o `./client`).
2. Configurar variables de entorno en Vercel:
   * `VITE_API_URL=https://<tu-backend-railway>.up.railway.app`
   * `VITE_SUPABASE_URL=https://<proyecto>.supabase.co`
   * `VITE_SUPABASE_ANON_KEY=...`
3. Ajustar `vite.config.ts` para que configure correctamente la URL de fallback en desarrollo y producción.

### Paso 3: Configuración del Backend en Railway / Render / PaaS
1. Crear un proyecto en Railway/Render conectado al mismo repo Git.
2. Definir comando de inicio: `pnpm start` (que ejecuta `node dist/index.js`).
3. Configurar variables de entorno del servidor:
   * `PORT=3000`
   * `NODE_ENV=production`
   * `DATABASE_URL=...` (Conexión Supabase Postgres)
   * `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET`
   * `CORS_ORIGIN=https://cleanleaf.vercel.app`

### Paso 4: Ajuste de CORS y Conexión de API
1. En `server/_core/index.ts`, habilitar y configurar middleware `cors`:
   ```ts
   import cors from "cors";
   app.use(cors({
     origin: process.env.CORS_ORIGIN || "*",
     credentials: true
   }));
   ```
2. En `client/src/lib/trpc.ts`, configurar el cliente tRPC para que apunte a `import.meta.env.VITE_API_URL || ""`.

---

## 4. Estimación de Esfuerzo y Matriz de Riesgos

| Tarea | Esfuerzo Estimado | Riesgo Principales | Mitigación |
| --- | --- | --- | --- |
| Creación de `Dockerfile` y ajuste de scripts | 2 - 4 horas | Incompatibilidad de paquetes nativos | Probar build Docker localmente antes de desplegar |
| Configuración de CORS y tRPC URL dinámica | 1 - 2 horas | Bloqueos CORS en peticiones preflight | Configurar `cors({ origin: true, credentials: true })` |
| Despliegue de Backend en Railway/Render | 2 - 3 horas | Fallo de variables de entorno o puerto | Revisar logs del contenedor en el dashboard PaaS |
| Despliegue de Frontend en Vercel | 1 - 2 horas | Rutas de SPA devolviendo 404 en refresh | Agregar `rewrites` en `vercel.json` hacia `index.html` |
| **TOTAL** | **6 - 11 horas** | **Bajo** | **Despliegue gradual en paralelo sin interrumpir DB** |

---

## 5. Recomendaciones de Operación y Buenas Prácticas

1. **Flujo de Ramas y CI/CD:**
   * `main`: Producción (Frontend en Vercel -> Backend en Railway Producción).
   * `develop` / `feat/*`: Entornos de Preview automáticos en Vercel y Railway.
2. **Monitoreo y Logging:**
   * Utilizar **Sentry** para captura de errores en el frontend React.
   * Utilizar **Pino / Winston** en el servidor Node.js y centralizar logs en Railway o Datadog.
3. **Manejo de Secretos:**
   * **Nunca** exponer credenciales de Copernicus o Supabase Service Role Key en variables con prefijo `VITE_`.
   * Toda la comunicación con APIs de satélites se realiza server-side.
4. **Resiliency Satelital:**
   * Mantener el mecanismo fail-safe de `shared/satellite-catalog.ts` para garantizar que configuraciones inválidas no interrumpan el servicio.

---

## Conclusión

La arquitectura actual de Cleanleaf v8.0 ha alcanzado el límite de lo que puede lograrse intentando forzar un servidor Express completo dentro del runtime Serverless de Vercel. **Migrar al Escenario B (Frontend SPA en Vercel + Backend API en PaaS dedicado + Supabase DB) es la decisión técnica más sana, robusta y económica para el proyecto.** Garantiza estabilidad operativa inmediata, elimina errores de empaquetado y deja la plataforma lista para la integración con Copernicus CDSE y n8n en las siguientes fases.
