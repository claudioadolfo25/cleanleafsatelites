# Guía de Despliegue Vercel — Cleanleaf MVP

## Vercel Serverless Function Deployment

### 1. Arquitectura de Despliegue
- **Frontend Estático:** Generado por `pnpm build` en `dist/public` y servido por CDN de Vercel.
- **Backend Function (`/api`):** Servidor Express serverless exportado desde `api/index.ts` (vía `server/app.ts`), manejando `/api/trpc` y endpoints REST.

### 2. Variables de Entorno Requeridas

#### Variables del Cliente (Prefijo `VITE_`)
- `VITE_SUPABASE_URL`: URL pública de Supabase Auth / Postgres
- `VITE_SUPABASE_ANON_KEY`: Key pública anon de Supabase
- `VITE_FRONTEND_FORGE_API_KEY`: Key opcional de mapas / Forge API
- `VITE_FRONTEND_FORGE_API_URL`: URL opcional de servicio Forge API
- `VITE_OAUTH_PORTAL_URL`: URL del portal OAuth
- `VITE_APP_ID`: ID único de aplicación

#### Variables del Servidor
- `SUPABASE_URL`: URL de proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret para operaciones administrativas Supabase
- `COPERNICUS_CLIENT_ID`: OAuth2 Client ID de Copernicus CDSE
- `COPERNICUS_CLIENT_SECRET`: OAuth2 Client Secret de Copernicus CDSE
- `ALLOWED_ORIGINS`: Dominios permitidos para CORS (ej: `https://cleanleafsatelites.vercel.app`)
- `NODE_ENV`: `production` | `development` | `test`
- `PORT`: Puerto HTTP (por defecto `3000` en ejecución local/Render)
- `DATABASE_URL`: URL de conexión MySQL / Postgres (si se usa Drizzle)
- `JWT_SECRET`: Secreto para verificación de firmas JWT
- `CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA`: Override opcional de catálogo agrícola
- `CLEANLEAF_SATELITES_HABILITADOS_ACUICULTURA`: Override opcional de catálogo acuícola
- `CLEANLEAF_SATELITES_HABILITADOS_FORESTAL`: Override opcional de catálogo forestal
- `CLEANLEAF_TIER1_MAX_HA`: Override de límite hectáreas Tier 1 (defecto `50`)
- `CLEANLEAF_TIER2_MAX_HA`: Override de límite hectáreas Tier 2 (defecto `5000`)

### 3. Verificación de Despliegue Local
```bash
pnpm check
pnpm test
pnpm build
```
