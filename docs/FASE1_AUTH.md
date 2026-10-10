# FASE 1 — Autenticación y Página Principal

## Resumen de la Implementación

La Fase 1 establece la puerta de entrada principal y el sistema de autenticación de Cleanleaf Satélites, garantizando el aislamiento por usuario mediante Supabase Row Level Security (RLS) y protegiendo todas las rutas bajo `/dashboard`.

### 1. Componentes Desarrollados
- **Landing Page Pública (`/`) — `client/src/pages/LandingPage.tsx`**:
  - Presentación de la propuesta de valor centrada en Copernicus CDSE y los 4 sectores principales (Agrícola, Forestal, Emergencias, Acuícola).
  - Botón dinámico de acceso ("Ingresar" si es visita anónima, "Ir al Dashboard" si la sesión está activa).
  - Enlace al catálogo de satélites (`/satelites`).

- **Página de Autenticación de 3 Vías (`/auth`) — `client/src/pages/AuthPage.tsx`**:
  1. **Correo + Contraseña**: Permite Registro, Inicio de Sesión y Recuperación de Contraseña mediante `supabase.auth`.
  2. **Teléfono (SMS OTP)**: Permite enviar y verificar códigos de un solo uso (OTP) por SMS mediante `supabase.auth.signInWithOtp` y `supabase.auth.verifyOtp`.
  3. **Google OAuth**: Integración con Google Sign-In mediante `supabase.auth.signInWithOAuth({ provider: 'google' })`.

- **Protección de Rutas — `client/src/components/ProtectedRoute.tsx`**:
  - Escucha activa del estado de autenticación y sesión de Supabase (`onAuthStateChange`).
  - Redirección automática de usuarios no autenticados desde `/dashboard/*` hacia `/auth`.

- **Cliente Supabase Configurable — `client/src/lib/supabaseClient.ts`**:
  - Inicialización del cliente `@supabase/supabase-js` utilizando las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Configuración del Proveedor SMS OTP (Twilio + Supabase)

Para habilitar el envío real de códigos OTP por SMS a teléfonos móviles (ej. en Chile `+569XXXXXXXX`), sigue estos pasos en el Dashboard de Supabase:

1. **Crear o acceder a un proyecto en Supabase**:
   - Ir a [Supabase Dashboard](https://supabase.com/dashboard).

2. **Habilitar Phone Auth Provider**:
   - Navega a **Authentication** -> **Providers** -> **Phone**.
   - Activa el interruptor **Enable Phone Provider**.

3. **Configurar el Proveedor de SMS (ejemplo: Twilio)**:
   - Selecciona **Twilio** como el proveedor de SMS.
   - Ingresa las siguientes credenciales obtenidas desde la consola de Twilio:
     - `Account SID`: Tu Twilio Account SID.
     - `Auth Token`: Tu Twilio Auth Token.
     - `Message Service SID` (o `Twilio Phone Number`): Identificador del servicio de mensajería de Twilio.
   - Guarda los cambios.

4. **Variables de entorno de referencia (`.env`)**:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   TWILIO_ACCOUNT_SID=tu-account-sid
   TWILIO_AUTH_TOKEN=tu-auth-token
   TWILIO_MESSAGE_SERVICE_SID=tu-message-service-sid
   ```

---

## Verificación de Aceptación (Fase 1)

1. **Página Principal pública**: Acceso en `/` sin requerir autenticación previa.
2. **Autenticación 3 Vías**: Formularios de Correo/Contraseña, Teléfono SMS y Google OAuth operativos en `/auth`.
3. **Rutas protegidas**: Al intentar acceder directamente a `/dashboard` sin sesión activa, la app redirige automáticamente a `/auth`.
4. **Cierre de sesión**: Botón de logout disponible en el header, finalizando la sesión en Supabase y redirigiendo adecuadamente.
