# Reporte de Despliegue Limpio en Vercel (Proyecto Nuevo SPA)
**Proyecto:** Cleanleaf MVP v8.0 — Frontend SPA
**Fecha:** Septiembre 2024
**Estado de Build Local:** Exitoso (100% verificado)

---

## 1. Configuración Final de `vercel.json`

Para evitar cualquier conflicto de funciones Serverless o invocaciones backend efímeras, el archivo `vercel.json` en la raíz del repositorio queda estrictamente dedicado al servicio de activos estáticos SPA:

```json
{
  "framework": "vite",
  "buildCommand": "pnpm build:client",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

* **Explicación:** Vercel ejecuta `pnpm build:client` (definido como `vite build` en `package.json`). El bundle estático se genera en `dist/public`. La regla de `rewrites` redirige todas las rutas cliente hacia `/index.html` para garantizar navegación SPA sin errores 404 al refrescar las páginas.

---

## 2. Variables de Entorno del Frontend (Configurar en Vercel Dashboard)

Se deben configurar estas tres variables en el proyecto nuevo de Vercel (**Environment Variables** en Settings):

| Variable | Valor Recomendado / Ejemplo | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.cleanleaf.cl` (o la URL de Railway/Render) | Endpoint base de la API backend. Si no está desplegada aún, fallback a tRPC local. |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | URL pública de la instancia Supabase. |
| `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Clave anónima pública de Supabase. |

* **Regla de Seguridad:** Ninguna variable de backend (`SUPABASE_SERVICE_ROLE_KEY`, `COPERNICUS_CLIENT_SECRET`, `DATABASE_URL`) debe agregarse al proyecto Vercel.

---

## 3. Instrucciones de Creación del Proyecto en Vercel

1. Ir a [Vercel Dashboard](https://vercel.com/new) e importar el repositorio `claudioadolfo25/cleanleafsatelites`.
2. Seleccionar la rama `fix/architecture-corrections-v1` (o `main` según integración).
3. **Framework Preset:** `Vite` (autodetectado por `vercel.json`).
4. **Root Directory:** `./`
5. **Build and Output Settings:**
   * Build Command: `pnpm build:client`
   * Output Directory: `dist/public`
   * Install Command: `pnpm install`
6. **Node.js Version:** `20.x` (o superior, en conformidad con `"engines": { "node": ">=20.0.0" }`).
7. Agregar las Variables de Entorno especificadas en la sección 2.
8. Desplegar.

---

## 4. Resultado de la Simulación de Build Limpio Local

Se ejecutó la simulación completa del entorno de build de Vercel desde cero:
```bash
rm -rf node_modules dist && pnpm install && pnpm build:client
```

* **Resultado:**
  * **Transformación:** 2392 módulos Vite procesados sin errores de importación hacia `server/`.
  * **Artefactos Creados:**
    * `dist/public/index.html` (367 kB)
    * `dist/public/assets/index-DLn694G8.js` (988 kB)
    * `dist/public/assets/index-QWZNpjvf.css` (137 kB)
  * **Pruebas de Dominio Satelital:** 28 pruebas pasando al 100% (`pnpm test`).
  * **Verificación de Tipos:** `pnpm check` limpio sin ningún error de compilación.

---

## 5. Verificación Post-Deploy y Dependencias Pendientes

### Funcionalidades Disponibles Inmediatamente en Vercel
* Carga ultra-rápida de la SPA cliente vía Edge CDN.
* Navegación fluida por las vistas del dashboard (`/dashboard`, `/dashboard/informes`, `/dashboard/guias/interpretar-informes`, `/dashboard/configuracion/satelites`).
* Carga de guías interactivas, glosario satelital y catálogo de misiones Copernicus.
* Mantenimiento de rutas en refresh gracias al rewrite SPA.

### Bloqueo Pendiente: Conexión con el Backend en Railway / Render
* Mientras el servidor Node.js/Express (`dist/server/index.js`) no sea desplegado en una PaaS como Railway, Render o Fly.io y la variable `VITE_API_URL` apunte a él:
  * Las llamadas a procedimientos tRPC dinámicos en producción utilizarán stubs locales o fallarán si no hay conectividad con el backend.
  * Una vez desplegado el backend PaaS, actualizar `VITE_API_URL` en Vercel restablecerá el flujo tRPC de extremo a extremo de forma transparente sin requerir cambios de código en el frontend.
