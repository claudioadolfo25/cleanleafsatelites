# INVENTARIO COMPLETO DE LA UI ACTUAL DE CLEANLEAF

**Fecha de Auditoría:** Mayo 2025
**Estado:** Auditoría de Software y Evaluación de Interfaz

---

## 1. RUTAS Y PANTALLAS

| Path | Componente Principal | ¿Requiere Autenticación? | ¿Requiere Tenant? | ¿Requiere Rol Específico? |
| :--- | :--- | :---: | :---: | :---: |
| `/` | `LandingPage.tsx` | No | No | No |
| `/auth` | `AuthPage.tsx` | No | No | No |
| `/auth/restablecer-password` | `ResetPasswordPage.tsx` | No | No | No |
| `/satelites` | `SatellitesPlaceholderPage.tsx` | No | No | No |
| `/dashboard` | `Home.tsx` | **Sí** (`ProtectedRoute`) | **Sí** (vía JWT) | Usuario general (`user`, `admin`, `owner`, `super_admin`) |
| `/dashboard/admin` | `AdminDashboardPage.tsx` | **Sí** (`ProtectedRoute`) | **Sí** | **Sí** (`super_admin`) |
| `/dashboard/perfil` | `ProfilePage.tsx` | **Sí** (`ProtectedRoute`) | No | No |
| `/dashboard/predios` | `PrediosPage.tsx` | **Sí** (`ProtectedRoute`) | **Sí** | Usuario general |
| `/dashboard/configuracion/satelites` | `SatelliteConfiguration.tsx` | **Sí** (`ProtectedRoute`) | **Sí** | Usuario general |
| `/dashboard/informes/:id` | `ReportDetail.tsx` | **Sí** (`ProtectedRoute`) | **Sí** | Usuario general |
| `/dashboard/informes` | `ReportsDashboard.tsx` | **Sí** (`ProtectedRoute`) | **Sí** | Usuario general |
| `/404` | `NotFound.tsx` | No | No | No |

---

## 2. BOTONES Y ACCIONES

### 1. `LandingPage.tsx` (Ruta: `/`)
* **"Conoce los satélites"**
  * **Endpoint / Acción:** Redirige a `/satelites` vía router local (`wouter`).
  * **Origen de Datos:** N/A (Navegación).
  * **Feedback:** Cambio de pantalla inmediato.
* **"Ir al Dashboard" / "Acceder al Dashboard"** (si hay sesión activa)
  * **Endpoint / Acción:** Redirige a `/dashboard`.
  * **Origen de Datos:** Estado de sesión local/Supabase SDK.
  * **Feedback:** Redirección al Dashboard.
* **"Ingresar" / "Ingresar a la Plataforma"** (si no hay sesión)
  * **Endpoint / Acción:** Redirige a `/auth`.
  * **Origen de Datos:** N/A.
  * **Feedback:** Redirección al Formulario de Autenticación.

---

### 2. `AuthPage.tsx` (Ruta: `/auth`)
* **"Volver al inicio"**
  * **Endpoint / Acción:** Navega a `/`.
  * **Feedback:** Redirección.
* **"Continuar con Google"**
  * **Endpoint / Acción:** Invoca `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  * **Origen de Datos:** **Real** (Servicio de autenticación Google / Supabase Auth).
  * **Feedback:** Redirección a proveedor OAuth de Google; en error muestra banner de alerta.
* **"Ingresar con Correo" / "Crear Cuenta" / "Enviar Correo de Recuperación"**
  * **Endpoint / Acción:** Invoca `supabase.auth.signInWithPassword`, `signUp` o `resetPasswordForEmail`.
  * **Origen de Datos:** **Real** (Supabase Auth API).
  * **Feedback:** Spinner `"Procesando..."`; mensaje de confirmación/error en tarjeta UI. Redirige a `/dashboard` si es exitoso.
* **"Enviar Código OTP por SMS"**
  * **Endpoint / Acción:** Invoca `supabase.auth.signInWithOtp({ phone })`.
  * **Origen de Datos:** **Real** (Supabase Auth Phone / Twilio).
  * **Feedback:** Spinner `"Enviando SMS..."`; cambia la vista al cuadro de verificación OTP.
* **"Verificar Código e Ingresar"**
  * **Endpoint / Acción:** Invoca `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
  * **Origen de Datos:** **Real** (Supabase Auth).
  * **Feedback:** Spinner `"Verificando..."`; redirección automática a `/dashboard`.

---

### 3. `Home.tsx` - Dashboard Resumen (Ruta: `/dashboard`)
* **"Reintentar"** (Error de carga)
  * **Endpoint:** `trpc.cleanleaf.dashboard.useQuery()`
  * **Origen de Datos:** **Real** (Consultas Agregadas DB PostgreSQL via Supabase).
  * **Feedback:** Recarga datos con indicador de carga.
* **"Nuevo análisis" / "Solicitar análisis de prueba"**
  * **Endpoint / Acción:** Abre el modal interactivo `SolicitudAnalisisForm.tsx`.
  * **Feedback:** Abre cuadro de diálogo modal.
* **"Crear Predio"**
  * **Endpoint / Acción:** Redirige a `/dashboard/predios`.
  * **Feedback:** Navegación a la gestión de predios.
* **"Preparar informe"**
  * **Endpoint / Acción:** Redirige a `/dashboard/informes`.
  * **Feedback:** Navegación a la lista de informes.

---

### 4. `SolicitudAnalisisForm.tsx` (Componente Modal de Nueva Solicitud)
* **"Solicitar análisis"**
  * **Endpoint / Handler:** Invoca `trpc.cleanleaf.createAnalysis.useMutation()`
  * **Origen de Datos:** **Real / Híbrido** (Inserta fila en tabla `solicitudes` DB. Procesa CDSE Copernicus en segundo plano por el worker asíncrono; si está en `DEMO_MODE=true` o política sintética, invoca generador simulado).
  * **Feedback:**
    * **Loading:** Botón deshabilitado mostrando `"Creando solicitud…"`.
    * **Éxito:** Muestra `toast.success("Análisis creado", { description: ... })` y redirige a `/dashboard/informes`.
    * **Error:** Muestra `toast.error("No pudimos crear la solicitud", { description: error.message })`.

---

### 5. `PrediosPage.tsx` (Ruta: `/dashboard/predios`)
* **"Nuevo Predio" / "Agregar primer predio"**
  * **Endpoint / Acción:** Abre diálogo modal de creación con mapa interactivo y carga GeoJSON.
* **"Guardar Predio"**
  * **Endpoint:** Invoca `trpc.predios.create.useMutation()`
  * **Origen de Datos:** **Real** (Inserta en tabla `predios` en PostgreSQL Supabase con cálculo de BBOX y superficie WGS84).
  * **Feedback:**
    * **Loading:** Muestra spinner y deshabilita.
    * **Éxito:** `toast.success("Predio creado con éxito", ...)` e invalida `predios.list`.
    * **Error:** `toast.error("Error al crear el predio", ...)`.
* **Eliminar Predio (Icono Papelera)**
  * **Endpoint:** Invoca `trpc.predios.delete.useMutation()`
  * **Origen de Datos:** **Real** (Elimina registro en DB).
  * **Feedback:** `toast.success("Predio eliminado")` o `toast.error("No se pudo eliminar el predio")`.

---

### 6. `ReportsDashboard.tsx` y `ReportDetail.tsx` (Rutas: `/dashboard/informes` y `/dashboard/informes/:id`)
* **"+ Generar nuevo informe"**
  * **Endpoint / Acción:** Abre `SolicitudAnalisisForm`.
* **"Ver trazabilidad"**
  * **Endpoint / Acción:** Redirige a `/dashboard/informes/:id`.
* **Botones de Descarga (`ReportDownloadActions.tsx`):**
  * **"Descargar PDF"**
    * **Endpoint:** Invoca `trpc.cleanleaf.reports.getDownloadUrl.useQuery()`
    * **Origen de Datos:** **Real** (Obtiene URL firmada del bucket de Supabase Storage `reports/{tenant_id}/{report_id}.pdf`).
    * **Feedback:** Toast de éxito `toast.success("PDF generado exitosamente")` e inicia descarga mediante `<a download>`.
  * **"GeoJSON"**
    * **Endpoint:** Invoca `trpc.cleanleaf.reports.getGeoJson.useQuery()`
    * **Origen de Datos:** **Real** (Genera FeatureCollection GeoJSON con geometría del predio y métricas de satélite).
    * **Feedback:** Toast `toast.success("GeoJSON exportado con éxito")` y descarga archivo `.geojson`.
  * **"Word (.doc)"**
    * **Endpoint:** Generación en cliente mediante Blob HTML/Word.
    * **Origen de Datos:** **Local / Cliente**.
    * **Feedback:** Descarga directa de archivo `.doc`.
  * **"Markdown"**
    * **Endpoint:** Generación en cliente.
    * **Origen de Datos:** **Local / Cliente**.
    * **Feedback:** Descarga directa de archivo `.md`.
* **"Reintentar"** (En informe fallido `ReportDetail.tsx`)
  * **Endpoint / Acción:** Muestra `toast.info("Reintento preparado", { description: "Creando nueva solicitud para el predio." })`.

---

### 7. `SatelliteConfiguration.tsx` (Ruta: `/dashboard/configuracion/satelites`)
* **"Aplicar recomendación"**
  * **Endpoint / Acción:** Actualiza estado local con satélites recomendados según vertical agronómica/acuícola.
  * **Feedback:** Toast `toast.success("Recomendación aplicada")`.
* **"Guardar configuración"**
  * **Endpoint:** Invoca `trpc.preferences.updateUserPreferences.useMutation()`
  * **Origen de Datos:** **Real** (Persiste preferencias de satélites e índices en tabla DB).
  * **Feedback:** Toast `toast.success("Configuración guardada en servidor")` o `toast.error(...)`.

---

### 8. `AdminDashboardPage.tsx` (Ruta: `/dashboard/admin` - Exclusivo `super_admin`)
* **"Guardar Plan"** (Gestión de Tenants)
  * **Endpoint:** Invoca `trpc.admin.updatePlan.useMutation()`
  * **Origen de Datos:** **Real** (Actualiza límite de cuota y plan en tabla `tenants`).
  * **Feedback:** `toast.success("Plan actualizado con éxito.")`.
* **"Reintentar"** (Tabla de Solicitudes Fallidas)
  * **Endpoint:** Invoca `trpc.admin.retrySolicitud.useMutation()`
  * **Origen de Datos:** **Real** (Re-encola la solicitud fallida en el worker).
  * **Feedback:** `toast.success("Solicitud reintentada.")`.

---

### 9. `ProfilePage.tsx` (Ruta: `/dashboard/perfil`)
* **"Guardar Cambios de Perfil"**
  * **Endpoint / Acción:** Invoca `supabase.auth.updateUser({ data: { name, organization } })`.
  * **Origen de Datos:** **Real** (Supabase Auth Metadata).
  * **Feedback:** Notificación de éxito.
* **"Cambiar Contraseña"**
  * **Endpoint / Acción:** Invoca `supabase.auth.updateUser({ password })`.
  * **Origen de Datos:** **Real** (Supabase Auth).
  * **Feedback:** Notificación de éxito o error de validación.

---

## 3. FLUJOS DE USUARIO

### Flujo 1: Alta de Predio y Delimitación Geográfica
1. **Paso 1: Navegación.** El usuario va a `/dashboard/predios`. (**Real**: Carga lista de predios desde DB).
2. **Paso 2: Creación.** Presiona "Nuevo Predio", dibuja en el mapa Leaflet o sube un archivo `.geojson` local. (**Real**: Validación de geometría WGS84 Polygon/MultiPolygon en cliente).
3. **Paso 3: Guardado.** Completa nombre y tipo de cultivo, presiona "Guardar Predio". (**Real**: Inserción en tabla `predios` de PostgreSQL Supabase con cálculo de BBOX).

### Flujo 2: Solicitud y Procesamiento de Análisis Satelital
1. **Paso 1: Inicio.** Desde `/dashboard` o `/dashboard/informes`, abre modal "Nuevo Análisis". (**Real**: Carga catálogo de satélites y predios registrados).
2. **Paso 2: Configuración.** Selecciona predio, rango de fechas (ej. últimos 30 días) e índices (NDVI, NDWI, EVI, etc.).
3. **Paso 3: Envío.** Presiona "Solicitar Análisis". (**Real**: Se crea registro en tabla `solicitudes` con estado `pendiente`).
4. **Paso 4: Procesamiento Asíncrono.** El worker de backend detecta la solicitud y consulta la Statistical API de Copernicus CDSE. (**Híbrido/Real**: En entorno Staging/Producción con credenciales efectivas ejecuta CDSE real; en modo `synthetic_demo_only` o falta de credenciales, ejecuta el proveedor sintético determinista).
5. **Paso 5: Finalización.** El worker calcula estadísticas, genera la interpretación agronómica, construye la serie temporal, compila el PDF via PDFKit, sube el PDF a Supabase Storage (`reports/{tenant_id}/{report_id}.pdf`) y actualiza el informe a `completado`.

### Flujo 3: Visualización de Informe y Exportación de Resultados
1. **Paso 1: Consulta.** El usuario navega a `/dashboard/informes` o `/dashboard/informes/:id`. (**Real**: Lee estado, serie histórica e hitos de trazabilidad desde la DB).
2. **Paso 2: Exportación PDF.** Presiona "Descargar PDF". (**Real**: El backend genera una URL firmada de Supabase Storage con validez de 60 segundos).
3. **Paso 3: Exportación GeoJSON.** Presiona "GeoJSON". (**Real**: Genera y entrega el GeoJSON estructurado con métricas adjuntas).

---

## 4. DATOS MOCK Y FALLBACKS EN EL SISTEMA

| Ubicación (Archivo y Función/Línea) | Condición o Detonante | Descripción de lo que Simula |
| :--- | :--- | :--- |
| `server/copernicus.ts` (`SyntheticCopernicusProvider`) | Ejecutado cuando no hay credenciales CDSE o en política `synthetic_demo_only`. | Simula valores medios y desviaciones estándar de índices vegetacionales (NDVI, NDWI, NDMI, EVI) para Sentinel-1, Sentinel-2 y Sentinel-3 mediante funciones sinusoidales deterministas. |
| `server/copernicus.ts` (`FallbackObservationProvider`) | Fallo HTTP o timeout en llamada viva a Copernicus CDSE (en modo fallback). | Redirige silenciosamente la consulta a `SyntheticCopernicusProvider` para evitar interrupciones de servicio. |
| `server/routers.ts` (`cleanleaf.dashboard`) | Cuando la tabla `solicitudes` no tiene filas para el tenant o `DEMO_MODE=true`. | Retorna métricas globales simuladas (`demoDashboard`: 128.5 ha monitoreadas, 94.2% cobertura NDVI, etc.). |
| `server/routers.ts` (`cleanleaf.reports.list` y `getById`) | Cuando el `tenant_id` es `"tenant-demo"` o `DEMO_MODE=true` (excluyendo política `live`). | Retorna lista de informes demo (`demoReports`) con trazabilidad sintética (`demoTrace`). |
| `client/src/components/SolicitudAnalisisForm.tsx` (Línea ~57) | Cuando el usuario no ha registrado ningún predio aún. | Usa el predio de demostración predeterminado `"predio-demo-las-quinas"`. |
| `client/src/components/CopernicusResourcePanel.tsx` (Línea ~38) | Vista previa visual en panel informativo. | Muestra resumen de cobertura con datos estáticos de zona demo Araucanía. |

---

## 5. ESTADO DE CONEXIÓN CON EL MOTOR COPERNICUS

| Funcionalidad del Motor | ¿UI tiene pantalla? | ¿Llama a Endpoint Real? | ¿Endpoint llama a CDSE Real o Mock? |
| :--- | :---: | :---: | :--- |
| **1. Gestión de Predios y Polígonos** | **Sí** (`/dashboard/predios`) | **Sí** (`trpc.predios.create`, `list`, `delete`) | **Real** (Base de datos PostgreSQL Supabase con cálculo espacial WGS84). |
| **2. Solicitudes de Análisis Satelital** | **Sí** (`SolicitudAnalisisForm`) | **Sí** (`trpc.cleanleaf.createAnalysis`) | **Híbrido** (Llama a Copernicus CDSE Statistical API en vivo cuando `COPERNICUS_PROD_POLICY=live` y credenciales configuradas; usa `SyntheticCopernicusProvider` si se encuentra en modo simulado `synthetic_demo_only`). |
| **3. Series Temporales (NDVI, NDWI, etc.)** | **Sí** (`ReportDetail`, `VariableChart`) | **Sí** (`trpc.cleanleaf.reports.getById`) | **Real / Persistido** (Obtiene datos de la tabla `observaciones_serie`. En política `live` prohíbe la persistencia o devolución de filas sintéticas). |
| **4. Generación y Descarga de PDF** | **Sí** (`ReportDownloadActions`) | **Sí** (`trpc.cleanleaf.reports.getDownloadUrl`) | **Real** (PDFKit compila en servidor con gráficos y métricas reales; almacena en Supabase Storage privado y entrega mediante URL firmada). |
| **5. Exportación GeoJSON** | **Sí** (`ReportDownloadActions`) | **Sí** (`trpc.cleanleaf.reports.getGeoJson`) | **Real** (Construye FeatureCollection WGS84 con propiedades dinámicas calculadas). |
| **6. Alertas y Anomalías Agronómicas** | **Sí** (Sección alertas en `/dashboard`) | **Sí** (`trpc.cleanleaf.dashboard`) | **Real / Detección Automática** (Calculado por el motor de interpretación agronómica `server/analysis/interpret.ts` sobre la serie temporal procesada). |
