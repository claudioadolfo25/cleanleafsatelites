# AGENTS.md — Cleanleaf

Contexto obligatorio para cualquier agente (Jules u otro) que trabaje en este repositorio. Léelo completo antes de modificar código.

## 1. Arquitectura y despliegue

**Render es nuestro backend y el único entorno de producción.** Vercel ya no se usa: no diseñes, mantengas ni arregles nada pensando en Vercel ni en funciones serverless.

- Servicio: Render Web Service `cleanleafsatelites` → https://cleanleafsatelites.onrender.com
- Rama de despliegue: `main`
- Build: `pnpm install --frozen-lockfile && pnpm run build` (vite build + esbuild de `server/_core/index.ts` → `dist/index.js`)
- Start: `pnpm run start` (`NODE_ENV=production node dist/index.js`)
- Render inyecta `PORT` (10000). El servidor es un proceso Node persistente, no una función serverless.
- Express sirve la API (tRPC en `/api/trpc`) **y** el frontend compilado (`dist/public`) desde la misma URL. No hay CORS ni dominios cruzados: el navegador usa rutas relativas.

## 2. Stack

Vite 7 + React 19 + Express 4 + tRPC 11 + drizzle-orm + mysql2 (MySQL). Plantilla tipo Manus (OAuth propio, storage proxy en `/manus-storage`). Gestor de paquetes: pnpm.

## 3. Estado verificado

- `GET /api/trpc/cleanleaf.dashboard` responde JSON de tRPC con datos de demostración (hoy sin sesión).
- `GET /api/oauth/callback` sin parámetros responde `{"error":"code and state are required"}`: la ruta existe. Callback a registrar en el proveedor OAuth: `https://cleanleafsatelites.onrender.com/api/oauth/callback`
- Al arrancar se registra `[OAuth] ERROR: OAUTH_SERVER_URL is not configured!`: faltan variables de entorno en el panel de Render. Las carga el propietario del proyecto; tú solo documentas sus nombres.

## 4. Reglas

1. Elimina cualquier resto de Vercel: `api/index.ts`, `vercel.json`, `"api/**/*"` en `tsconfig.json`, referencias en documentación.
2. Escucha en `process.env.PORT` y `0.0.0.0`. Usa `app.set("trust proxy", 1)` (Render está detrás de un proxy; necesario para `req.protocol` y cookies `secure`).
3. Mantén una única app Express. Puedes extraerla a `server/app.ts` con `createApp()` para facilitar tests, pero el entrypoint de producción sigue siendo `dist/index.js`.
4. Las variables `VITE_*` se incrustan al compilar el frontend y el build también corre en Render: documenta cuáles deben existir **antes** del build.
5. Disco efímero: no guardes archivos en el sistema de archivos del servidor.
6. Plan Free: el servicio se duerme tras 15 min de inactividad (arranque en frío ~50 s). El cliente debe mostrar estado de carga y de error con botón "Reintentar", nunca una pantalla vacía.
7. Fija `"engines": { "node": "20.x" }` en `package.json`.
8. No cambies la lógica de negocio ni el esquema de base de datos.
9. Nunca imprimas ni commitees secretos. No necesitas API keys de Render: el despliegue ocurre al hacer merge a `main`.
10. No agregues dependencias salvo `devDependencies` de test (por ejemplo `supertest`).

## 5. Flujo de trabajo

1. Trabaja en una rama nueva desde `main`; un commit por tarea con mensaje descriptivo.
2. Antes de abrir el PR ejecuta: `pnpm check`, `pnpm test`, `pnpm build` (cero errores).
3. Abre el PR. El propietario revisa y hace merge a `main`; Render despliega automáticamente.
4. Deja en la descripción del PR: archivos modificados y motivo, variables de entorno (obligatorias vs. opcionales, y cuáles `VITE_*` van antes del build) y el checklist post-deploy.

## 6. Checklist post-deploy

- `GET /api/health` → `{ "status": "ok", ... }` con `checks` de variables críticas en `true` (solo booleanos, nunca valores)
- `GET /api/trpc/cleanleaf.dashboard` → JSON de tRPC (no HTML)
- `GET /api/ruta-inexistente` → 404 en JSON (no HTML)
- La web carga el dashboard y el login completa el callback OAuth
