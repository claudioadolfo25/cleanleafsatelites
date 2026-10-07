# Guía de Despliegue — AgroPulso / Cleanleaf MVP v8.0

## Vercel + Render + Supabase Infrastructure

### 1. Configuración Vercel Serverless
El proyecto incluye `vercel.json` configurado para redirigir peticiones `/api/*` al handler serverless `api/index.ts` y servir los archivos estáticos desde `dist/public`.

### 2. Variables de Entorno Requeridas

#### Producción Vercel & Render
- `SUPABASE_URL`: URL del proyecto Supabase (ej: `https://xyz.supabase.co`)
- `SUPABASE_ANON_KEY`: Clave pública anon de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio para operaciones admin (solo backend Render/Serverless)
- `COPERNICUS_CLIENT_ID`: Client ID para autenticación OIDC Copernicus CDSE
- `COPERNICUS_CLIENT_SECRET`: Client Secret para autenticación OIDC Copernicus CDSE
- `JWT_SECRET`: Secreto para firma y validación de tokens JWT Supabase Auth
- `NODE_ENV`: `production`
- `ALLOWED_ORIGINS`: Origin permitido para encabezados CORS (ej: `https://agropulso.vercel.app`)

### 3. Pasos para Aplicar Migraciones Supabase
```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
psql "$SUPABASE_DB_URL" -f supabase/tests_rls.sql
```

### 4. Verificación de Despliegue Local
```bash
pnpm check
pnpm test
pnpm build
```
