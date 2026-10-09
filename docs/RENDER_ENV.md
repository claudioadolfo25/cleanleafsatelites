# Variables de Entorno — Cleanleaf (Render Production)

| Variable | Obligatoria / Opcional | Leída en | `VITE_*` (Pre-build) | Descripción |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | Obligatoria | Server / Client | No | Entorno Node.js (`production`, `development`). |
| `APP_ENV` | Opcional | Server / Client | No | Guard explícito de entorno (`production`, `staging`). |
| `PORT` | Obligatoria | Server | No | Puerto de escucha en Render (default `10000`). |
| `DATABASE_URL` | Obligatoria (Live DB) | Server | No | URL de conexión a la base de datos PostgreSQL. |
| `JWT_SECRET` | Obligatoria | Server | No | Secreto para firma de cookies de sesión y tokens JWT. |
| `COPERNICUS_CLIENT_ID` | Opcional | Server | No | Client ID de Copernicus CDSE (Default: `sh-79ab7ae6-ca8d-4823-90d1-fca2c30fe535`). |
| `COPERNICUS_CLIENT_SECRET` | Obligatoria (CDSE Live) | Server | No | Secreto de cliente OAuth2 para Copernicus CDSE. |
| `COPERNICUS_TOKEN_URL` | Opcional | Server | No | Endpoint token de Copernicus CDSE (Default: OpenID Connect CDSE realm). |
| `OAUTH_SERVER_URL` | Opcional | Server | No | URL del servidor backend de autenticación OAuth. |
| `VITE_OAUTH_PORTAL_URL` | Opcional | Client | **Sí** | Portal frontend de autenticación Manus OAuth. |
| `DEMO_PUBLIC_DASHBOARD` | Opcional | Server | No | Permite acceso público al dashboard demo (`true`/`false`, default `true`). |
