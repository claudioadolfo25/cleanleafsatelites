# Guía de Variables de Entorno para Vercel (Cleanleaf SaaS)

Este documento detalla las variables de entorno necesarias para desplegar Cleanleaf de forma 100% operativa en Vercel (Production y Preview environments).

---

## 1. Variables Críticas del Servidor (Serverless Functions)

Configurar en **Vercel → Settings → Environment Variables** marcando los entornos **Production**, **Preview** y **Development**:

| Variable | Tipo | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Servidor | Entorno de ejecución de Node.js | `production` |
| `SUPABASE_URL` | Servidor | URL del proyecto Supabase backend | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Servidor | Clave pública anónima de Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | Clave de servicio de Supabase (uso seguro server-side) | `eyJhbGciOi...` |
| `COPERNICUS_CLIENT_ID` | Servidor | OAuth Client ID para CDSE (Copernicus) | `sh-xxxx-xxxx` |
| `COPERNICUS_CLIENT_SECRET` | Servidor | OAuth Client Secret para CDSE (Copernicus) | `xxxx-xxxx-xxxx` |
| `COOKIE_SECRET` | Servidor | Secreto de firma para cookies de sesión JWT | `secret-de-firma-de-al-menos-32-caracteres` |
| `OAUTH_SERVER_URL` | Servidor | URL base para servidor OAuth si aplica | `https://oauth.example.com` |
| `APP_ID` | Servidor | Identificador de aplicación para OAuth | `cleanleaf-app` |

---

## 2. Variables Públicas del Cliente Frontend (Vite Bundle)

| Variable | Tipo | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Frontend | URL pública de Supabase para cliente de navegador | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Clave pública de Supabase para cliente de navegador | `eyJhbGciOi...` |

> **Nota:** Las variables con prefijo `VITE_` son integradas estáticamente durante el proceso de build de Vite.

---

## 3. Diagnóstico de Salud en Producción (`/api/health`)

El endpoint `/api/health` evalúa la presencia de variables críticas sin exponer secretos en claro. Devuelve:

```json
{
  "status": "ok",
  "service": "agropulso-cleanleaf-api",
  "timestamp": "2026-03-31T12:00:00.000Z",
  "env": {
    "supabaseUrl": true,
    "supabaseAnonKey": true,
    "copernicusClientId": true,
    "copernicusClientSecret": true
  }
}
```

Si algún booleano figura en `false`, revisa la configuración correspondiente en la consola de Vercel y ejecuta un **Redeploy**.
