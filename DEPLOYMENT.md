# Guía de Despliegue en Vercel — Cleanleaf MVP v8.0

## Resumen de la Arquitectura
Cleanleaf es un SaaS de monitoreo satelital agrícola construido con un modelo **Jamstack / Serverless**:
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui compilado con Vite a `dist/public/`.
- **Backend / API**: Express + tRPC montado en la función serverless de Vercel (`api/index.ts`).
- **Base de Datos & Servicios Externos**: Supabase Postgres con Row Level Security (RLS) y Copernicus CDSE Data Space.

---

## Configuración de Vercel (Default Zero-Config Deployment)

Cleanleaf está optimizado para funcionar con la detección automática de Vercel sobre `pnpm`:
- **Build Command**: `pnpm build`
- **Output Directory**: `dist/public`
- **Root Directory**: `./` (raíz del repositorio)
- **Serverless Entrypoint**: Vercel detecta automáticamente `api/index.ts` como la función serverless principal. Los archivos compilados `api/*.js` se ignoran en `.gitignore`.

---

## Checklist de Variables de Entorno en Vercel Dashboard

Configurar las siguientes variables en **Project Settings -> Environment Variables**:

| Variable | Tipo / Valor Ejemplo | Requerida |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Opcional |
| `COPERNICUS_CLIENT_ID` | `your-copernicus-client-id` | Opcional (fallback sintético activo) |
| `COPERNICUS_CLIENT_SECRET` | `your-copernicus-client-secret` | Opcional (fallback sintético activo) |
| `DIFY_API_KEY` | `your-dify-api-key` | Opcional (fallbacks deterministas activos) |

---

## Checklist de Pre-Despliegue Local

Antes de hacer `git push` a la rama de despliegue, ejecutar:

```bash
# 1. Compilación completa
pnpm build

# 2. Chequeo de tipos estricto en TypeScript (retorna 0 errores)
pnpm check

# 3. Ejecución de suites de prueba
pnpm test
```

---

## Diagnóstico y Resolución de Problemas Frecuentes

### 1. `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server/routers'`
- **Causa**: Vercel no empaquetó la carpeta `server/` en la función serverless.
- **Solución**: Verificar que `vercel.json` tenga la propiedad `includeFiles: "server/**"`.

### 2. Conflicto de Archivos (`api/index.js conflicts with api/index.ts`)
- **Causa**: Coexistencia de un archivo `.js` compilado y el fuente `.ts` dentro de `api/`.
- **Solución**: Eliminar `api/index.js` y asegurar que `api/*.js` figure en `.gitignore`.

### 3. Errores de Tipos con Express en Build (`Property 'json' / 'headers' does not exist`)
- **Causa**: Duplicidad de versiones de `@types/express-serve-static-core`.
- **Solución**: Mantener fijadas las versiones en `pnpm.overrides` dentro de `package.json` (`@types/express: 4.17.21`, `@types/express-serve-static-core: 4.19.6`).
