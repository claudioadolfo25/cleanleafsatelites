# Guía de Despliegue - AgroPulso

## Arquitectura
- **Frontend:** Vercel (Vite + React SPA)
- **Backend:** Render (Express + tRPC API continuo en contenedor Docker)
- **Base de Datos:** Supabase Postgres

---

## Requisitos Previos
1. Cuenta activa en [Vercel](https://vercel.com)
2. Cuenta activa en [Render](https://render.com)
3. Proyecto activo en [Supabase](https://supabase.com)
4. Claves de API (OpenAI GPT-4o, Sentinel Hub Copernicus) — opcionales en MVP (el sistema cuenta con fallbacks mock)

---

## Paso 1: Configurar Base de Datos (Supabase)

1. Crear un proyecto en Supabase Dashboard.
2. Ir a **SQL Editor** y ejecutar el esquema DDL del proyecto:
   ```bash
   psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/schema.sql
   ```
3. Obtener las credenciales desde **Project Settings → API**:
   - `SUPABASE_URL`: URL del proyecto (`https://xxx.supabase.co`)
   - `SUPABASE_ANON_KEY`: Clave pública para cliente
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave secreta service role (solo backend)
   - `DATABASE_URL`: Cadena de conexión PostgreSQL (`postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres`)

---

## Paso 2: Desplegar Backend en Render

### Opción A: Despliegue con Blueprint (`render.yaml`)
1. Ir a Render Dashboard y hacer clic en **New + → Blueprint**.
2. Conectar el repositorio de GitHub `claudioadolfo25/cleanleafsatelites`.
3. Render detectará el archivo `render.yaml` automáticamente.
4. Rellenar los valores para las variables marcadas como `sync: false` (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`).
5. Hacer clic en **Apply**.

### Opción B: Despliegue Manual
1. Ir a Render Dashboard.
2. Hacer clic en **New + → Web Service**.
3. Conectar el repositorio de GitHub.
4. Configurar el servicio:
   - **Name:** `agropulso-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `fix/architecture-corrections-v1` (o `main`)
   - **Runtime:** `Docker`
   - **Build Command:** `./render-build.sh`
   - **Start Command:** `node dist/server/index.js`
   - **Plan:** Starter ($7/mes) o Free
5. Agregar las Variables de Entorno:
   ```env
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   DATABASE_URL=<de Supabase>
   SUPABASE_URL=<de Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<de Supabase>
   CORS_ORIGIN=https://tu-frontend.vercel.app
   LLM_PROVIDER=mock
   OPENAI_API_KEY=<tu clave - opcional>
   SATELLITE_PROVIDER=mock
   SENTINEL_HUB_CLIENT_ID=<tu ID - opcional>
   SENTINEL_HUB_CLIENT_SECRET=<tu secret - opcional>
   SENTINEL_HUB_INSTANCE_ID=<tu instance - opcional>
   ```
6. Hacer clic en **Create Web Service**.
7. Una vez completado el despliegue, copiar la URL pública del backend (ej. `https://agropulso-backend.onrender.com`).

---

## Paso 3: Desplegar Frontend en Vercel

### Opción A: Despliegue Manual (Vercel Dashboard)
1. Ir a [Vercel Dashboard](https://vercel.com/new).
2. Hacer clic en **Add New... → Project** e importar el repositorio.
3. Configurar el proyecto:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `pnpm build:client`
   - **Output Directory:** `dist/public`
   - **Install Command:** `pnpm install`
4. Agregar Variables de Entorno:
   ```env
   VITE_API_URL=https://agropulso-backend.onrender.com
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
5. Hacer clic en **Deploy**.
6. Una vez completado, copiar la URL pública de Vercel (ej. `https://agropulso.vercel.app`).

---

## Paso 4: Actualizar CORS en Backend (Render)

1. Ir al Dashboard de Render → `agropulso-backend` → **Environment**.
2. Actualizar `CORS_ORIGIN` con la URL exacta de Vercel:
   ```env
   CORS_ORIGIN=https://agropulso.vercel.app
   ```
3. Hacer clic en **Save Changes** y ejecutar un **Manual Deploy → Deploy latest commit**.

---

## Paso 5: Verificar Despliegue

### Test de Backend
```bash
curl -s https://agropulso-backend.onrender.com/health
# Respuesta esperada: {"ok":true,"service":"cleanleaf-api"}
```

### Test de Frontend
1. Abrir `https://agropulso.vercel.app` en el navegador.
2. Verificar que la aplicación SPA carga correctamente.
3. Abrir **DevTools → Network**.
4. Verificar que las llamadas tRPC navegan hacia `https://agropulso-backend.onrender.com/api/trpc`.

---

## Paso 6: Ejecutar Seed de Datos Demo (Opcional)

Si deseas poblar la base de datos con datos de demostración para Don Ernesto Cruz:
```bash
DATABASE_URL=<de Supabase> pnpm tsx server/seed.ts
```

---

## Solución de Problemas

* **Error: CORS bloqueado:**
  - Verificar que `CORS_ORIGIN` en Render coincida exactamente con la URL de Vercel (incluyendo `https://` y sin barra diagonal final `/`).
* **Error: API no responde o da timeout:**
  - En el plan gratuito de Render, la instancia entra en *sleep mode* tras 15 minutos de inactividad. La primera petición puede tardar 30-50 segundos en responder mientras se despierta.
  - Se puede configurar un ping automático cada 10 minutos con [Cron-Job.org](https://cron-job.org) apuntando a `https://agropulso-backend.onrender.com/health`.
* **Error: Variables de entorno no cargan en el cliente:**
  - Recuerda que solo las variables con el prefijo `VITE_` son incrustadas en el bundle del cliente en tiempo de build. Redesplegar en Vercel tras modificar variables en Settings.

---

## Costos Estimados
- **Render Backend:** Starter ($7/mes) o Free ($0/mes con sleep tras inactividad).
- **Vercel Frontend:** Gratis / Hobby ($0/mes para hasta 100 GB de transferencia).
- **Supabase DB:** Gratis ($0/mes para hasta 500 MB Postgres).
- **Total estimado:** ~$0 a $7/mes para el MVP.
