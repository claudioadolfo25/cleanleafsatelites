# Guía de Variables de Entorno - AgroPulso

Tabla de referencia para copiar y configurar las variables de entorno en **Vercel** (Frontend) y **Render** (Backend).

---

## 1. Vercel (Frontend SPA)

Configure estas variables en **Vercel Dashboard → Project Settings → Environment Variables**.
*Nota:* Solo las variables con prefijo `VITE_` son incrustadas públicamente en el bundle del navegador.

| Variable | Ejemplo / Valor | Requerido | Descripción |
| --- | --- | --- | --- |
| `VITE_API_URL` | `https://agropulso-backend.onrender.com` | **Sí** | URL pública HTTPS del servidor backend en Render (sin `/` al final). |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | **Sí** | URL pública de la instancia Supabase. |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsIn...` | **Sí** | Clave anónima pública de Supabase. |
| `VITE_ANALYTICS_ENDPOINT` | `https://analytics.example.com` | No | (Opcional) URL para script Umami analytics. |
| `VITE_ANALYTICS_WEBSITE_ID` | `your-website-id` | No | (Opcional) ID de sitio para Umami analytics. |

---

## 2. Render (Backend API Service)

Configure estas variables en **Render Dashboard → Environment** (o via `render.yaml`).
*Regla de Seguridad:* **NUNCA** agregue el prefijo `VITE_` a los secretos del backend.

| Variable | Ejemplo / Valor | Requerido | Descripción |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | **Sí** | Modo de ejecución del proceso Node.js. |
| `PORT` | `3000` | **Sí** | Puerto donde escucha la aplicación. |
| `HOST` | `0.0.0.0` | **Sí** | IP de binding para contenedores Docker en Render. |
| `DATABASE_URL` | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` | **Sí** | Cadena de conexión PostgreSQL de Supabase. |
| `SUPABASE_URL` | `https://your-project.supabase.co` | **Sí** | URL de la API de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsIn...` | **Sí** | Clave secreta service_role con acceso RLS de administración. |
| `CORS_ORIGIN` | `https://agropulso.vercel.app` | **Sí** | URL exacta del frontend en Vercel permitido para peticiones CORS. |
| `LLM_PROVIDER` | `mock` o `openai` | **Sí** | Proveedor del Agente 44.05 (`mock` o `openai`). |
| `OPENAI_API_KEY` | `sk-proj-...` | No | Clave de API de OpenAI (requerida si `LLM_PROVIDER=openai`). |
| `OPENAI_MODEL` | `gpt-4o` | No | Modelo de OpenAI para el agente (default: `gpt-4o`). |
| `SATELLITE_PROVIDER` | `mock` o `sentinelhub` | **Sí** | Proveedor de datos satelitales (`mock` o `sentinelhub`). |
| `SENTINEL_HUB_CLIENT_ID` | `your-sentinel-client-id` | No | OAuth2 Client ID de Copernicus CDSE / Sentinel Hub. |
| `SENTINEL_HUB_CLIENT_SECRET` | `your-sentinel-client-secret` | No | OAuth2 Client Secret de Copernicus CDSE / Sentinel Hub. |
| `SENTINEL_HUB_INSTANCE_ID` | `default` | No | Instance ID de Sentinel Hub. |
| `WEATHER_PROVIDER` | `mock` o `openweather` | **Sí** | Proveedor agroclimático (`mock` o `openweather`). |
| `OPENWEATHER_API_KEY` | `your-openweather-key` | No | API Key de OpenWeather (opcional). |
