# Guía de Variables de Entorno para Render (Cleanleaf SaaS)

Este documento contiene la lista completa de variables de entorno requeridas para desplegar Cleanleaf en el Render Web Service **`cleanleafsatelites`** (`https://cleanleafsatelites.onrender.com`).

---

## 1. Variables de Entorno del Servidor (Render Web Service)

Configurar en el panel de Render en **Dashboard → cleanleafsatelites → Environment**:

| Variable | Obligatoria | Descripción | Ejemplo / Valor por Defecto |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Sí | Entorno de ejecución de Node.js | `production` |
| `PORT` | Sí (Autoinyectada por Render) | Puerto en el que escucha Express | `10000` |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase backend | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Sí | Clave pública anónima de Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendada | Clave de servicio de Supabase (operaciones admin) | `eyJhbGciOi...` |
| `COPERNICUS_CLIENT_ID` | Opcional | Client ID de Copernicus CDSE (Análisis en vivo) | `sh-xxxx-xxxx` |
| `COPERNICUS_CLIENT_SECRET` | Opcional | Client Secret de Copernicus CDSE | `xxxx-xxxx-xxxx` |
| `COOKIE_SECRET` | Sí | Secreto de firma para cookies de sesión JWT | `secreto-de-al-menos-32-caracteres` |
| `OAUTH_SERVER_URL` | Sí | URL base del proveedor de autenticación OAuth | `https://oauth.example.com` |
| `APP_ID` | Sí | Identificador de aplicación para OAuth | `cleanleaf-app` |
| `DEMO_PUBLIC_DASHBOARD` | Opcional | Permitir acceso público al dashboard demo (`true`/`false`) | `true` |

---

## 2. Variables de Entorno del Cliente (Requeridas ANTES de Ejecutar el Build en Render)

Las variables con el prefijo `VITE_` son incrustadas directamente por Vite durante la fase de compilación (`pnpm run build`). Deben estar definidas en el entorno de Render **antes** de compilar:

| Variable | Obligatoria antes del Build | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Sí | URL pública de Supabase para el cliente de navegador | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave anónima de Supabase para el cliente de navegador | `eyJhbGciOi...` |
| `VITE_ANALYTICS_ENDPOINT` | Opcional | URL base de servidor Umami Analytics | `https://analytics.example.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | Opcional | ID del sitio en Umami Analytics | `xxxx-xxxx-xxxx` |

---

## 3. Tolerancia a Fallos e Inspección (`/api/health`)

La falta de una variable no crítica (como las credenciales de Copernicus o Analytics) **no detendrá** la ejecución del servidor Node.js. Al iniciar, el servidor emite advertencias informativas en los logs y las rutas afectadas devuelven respuestas de error JSON descriptivas.

Puedes verificar la presencia de variables críticas en cualquier momento realizando una petición a:
```http
GET https://cleanleafsatelites.onrender.com/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "service": "agropulso-cleanleaf-api",
  "timestamp": "2026-03-31T12:00:00.000Z",
  "checks": {
    "supabaseUrl": true,
    "supabaseAnonKey": true,
    "copernicusClientId": true,
    "copernicusClientSecret": true
  }
}
```

## Copernicus Catalog y análisis satelital

Configura estas variables en Render (solo en el servidor, nunca como `VITE_*`):

| Variable | Valor recomendado | Uso |
|---|---|---|
| `COPERNICUS_MODE` | `live` | Producción estricta: solo permite datos CDSE reales; sin credenciales queda degradado |
| `COPERNICUS_CLIENT_ID` | ID oficial | Cliente OAuth2 CDSE |
| `COPERNICUS_CLIENT_SECRET` | secreto privado | Token OAuth2; obligatorio para Catalog y Statistical API |
| `COPERNICUS_TOKEN_URL` | endpoint OIDC CDSE | Emisión del token |
| `COPERNICUS_CATALOG_URL` | `https://sh.dataspace.copernicus.eu/catalog/v1/search` | Búsqueda STAC Catalog |

La aplicación no realiza llamadas anónimas ni presenta datos simulados en producción: si falta el secreto, el health informa `catalogAuthConfigured=false` y la interfaz explica qué variable falta.
