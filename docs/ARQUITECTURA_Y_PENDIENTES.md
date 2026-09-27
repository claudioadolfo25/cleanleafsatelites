# Arquitectura, Estructura Actual y Hoja de Ruta AgroPulso / Cleanleaf

**Versión:** 1.0.0
**Fecha:** Septiembre 2026
**Estatus:** Diagnóstico y Especificación Técnica de Producción

---

## 1. Resumen Ejecutivo y Propósito de la Plataforma

**AgroPulso / Cleanleaf** es una plataforma SaaS de monitoreo agro-satelital y diagnóstico inteligente basada en la constelación **Copernicus Data Space Ecosystem (CDSE)** de la Agencia Espacial Europea (ESA).

La plataforma permite a productores e instituciones agrícolas, forestales y acuícolas:
1. Delimitar predios agrícolas mediante coordenadas decimales, delimitación de polígonos BBox y cálculo automático de superficie en hectáreas.
2. Procesar índices espectrales y radar (**NDVI, NDWI, EVI, Humedad de Suelo SAR, Temperatura LST**) usando Sentinel-1 (Radar SAR), Sentinel-2 (Óptico MSI con enmascaramiento de nubes SCL) y Sentinel-3 (OLCI / SLSTR).
3. Recibir diagnósticos agronómicos automatizados mediante un **Ecosistema Multi-Agente IA** (1 Orquestador Central + 6 Especialistas de Dominio: Datos/Sensores, Clima, Genética/Variedades, Nutrición, Sanidad, Gestión/Mecanización).
4. Garantizar aislamiento estricto de datos de clientes mediante **Multi-tenant RLS (Row Level Security)** respaldado en Supabase PostgreSQL + PostGIS y endpoints REST API v1 protegidos por JWT.

---

## 2. Arquitectura del Sistema Conseguida

```
                                  +-------------------------------------------------------+
                                  |                     CLIENTE WEB                       |
                                  |            Vite + React 19 + Tailwind CSS             |
                                  |                  (Despliegue Vercel)                  |
                                  +---------------------------+---------------------------+
                                                              |
                                                    HTTPS / REST API v1
                                                    Bearer JWT Token
                                                              |
                                                              v
                                  +-------------------------------------------------------+
                                  |                    BACKEND API                        |
                                  |               Express REST v1 (Node.js)               |
                                  |            (Despliegue Render / Railway)              |
                                  +------------+------------------------------+-----------+
                                               |                              |
                                      OAuth2 Access Token             Postgres Connection
                                     Client Credentials              (SSL / RLS app_metadata)
                                               |                              |
                                               v                              v
                          +----------------------------+    +----------------------------------+
                          |   COPERNICUS CDSE API      |    |        DATABASE SUPABASE         |
                          | (sh.dataspace.copernicus)  |    |     PostgreSQL 16 + PostGIS      |
                          |  - STAC Catalog API        |    |  - solicitudes_analisis          |
                          |  - Statistical API         |    |  - informes & mediciones         |
                          |  - Processing API (WMS)    |    |  - predios (Geometry Polygon)    |
                          +----------------------------+    +----------------------------------+
```

---

## 3. Estructura de Directorios del Repositorio

```
cleanleafsatelites/
├── client/                        # Frontend Single Page Application (SPA)
│   ├── index.html                 # Punto de entrada HTML
│   ├── vite.config.ts             # Configuración Vite (build outDir: dist)
│   └── src/
│       ├── App.tsx                # Enrutador principal de React
│       ├── components/            # Componentes reutilizables
│       │   ├── DashboardLayout.tsx# Layout principal con navegación lateral
│       │   ├── FloatingAgentWidget.tsx # Widget flotante interactivo del Agente IA
│       │   ├── ParcelMap.tsx      # Dibujo de mapas con MapLibre GL + Turf.js
│       │   └── SolicitudAnalisisForm.tsx # Formulario de solicitud con BBox y Filtros
│       ├── lib/                   # Clientes e integración de servicios
│       │   ├── copernicus.ts      # Proveedor de autenticación y consultas CDSE
│       │   ├── supabaseClient.ts  # Cliente Supabase JS para el navegador
│       │   └── userProfile.ts     # Gestión de perfil local y vertical industrial
│       └── pages/                 # Vistas principales de la plataforma
│           ├── AgentPage.tsx      # Zona de Entrenamiento y Consulta de Agentes IA
│           ├── AuthPage.tsx       # Inicio de sesión (Google OAuth + Email/Password)
│           ├── CopernicusWorkstationPage.tsx # Estación de Trabajo Satelital EO Browser
│           ├── CopernicusHistoryPage.tsx     # Registro histórico de escenas satelitales
│           ├── GuideInterpreterPage.tsx     # Guía interactiva de interpretación
│           ├── Home.tsx            # Resumen del Dashboard
│           ├── Landing3DPage.tsx   # Landing page 3D con satélites orbitando
│           ├── ProfilePage.tsx     # Configuración de perfil y verticales
│           ├── ReportsDashboard.tsx# Centro de Informes satelitales
│           ├── SatelliteConfiguration.tsx # Configuración de filtros satelitales
│           └── SupportPage.tsx    # Mesa de ayuda y soporte técnico
├── server/                        # Backend REST API Node.js / Express
│   ├── _core/
│   │   ├── index.ts               # Servidor HTTP Express daemon (port 5000)
│   │   ├── cookies.ts             # Utilidades de cookies
│   │   └── sdk.ts                 # SDK interno de servidor
│   ├── middleware/
│   ├── auth.ts                # Middleware de validación de Supabase JWT
│   ├── routes/
│   │   └── api-v1.ts              # Router de endpoints REST v1 (/api/v1/*)
│   ├── services/                  # Servicios de integración externa
│   │   ├── copernicus-auth.ts     # Gestión y cache de tokens OAuth2 CDSE
│   │   ├── copernicus-orchestrator.ts # Orquestador de análisis 3 pasos CDSE
│   │   ├── orchestrator.ts        # Orquestador de Agentes Especialistas IA
│   │   ├── specialists.ts         # Motor de 6 Especialistas Agronómicos
│   │   ├── satellite.ts           # Cliente Sentinel Hub / Mock
│   │   ├── weather.ts             # Integración meteorológica Open-Meteo
│   │   └── llm.ts                 # Servicio de lenguaje natural OpenAI / Mock
│   └── admin/
│       └── supabase-client.ts     # Cliente Supabase Service Role para administración
├── shared/                        # Módulos y tipos compartidos entre Client y Server
│   ├── domain-agents.ts           # Definición de schemas y tipos de los 7 Agentes
│   ├── plan-limits.ts             # Cuotas y límites por plan (Piloto, PyME, Región)
│   ├── report-templates.ts        # Plantillas de informe por vertical industrial
│   ├── satellite-catalog.ts       # Catálogo de misiones satelitales (Sentinel-1/2/3)
│   ├── satellite-router.ts        # Enrutador de procesamiento según superficie (ha)
│   └── types.ts                   # Tipos de datos compartidos de la plataforma
├── supabase/                      # Migraciones de Base de Datos y Pruebas RLS
│   ├── migrations/
│   │   ├── 20260924000000_init_schema.sql       # Tablas base multi-tenant
│   │   ├── 20260924000001_postgis_predios.sql   # Geometrías PostGIS en predios
│   │   ├── 20260924000002_domain_extensions.sql # Extensión de roles, pago e invitaciones
│   │   └── 20260924000003_auth_hooks.sql        # Hooks de seguridad para JWT app_metadata
│   ├── tests/
│   │   └── bootstrap_auth.sql                   # Helper de bootstrap para pruebas
│   └── tests_rls.sql                            # Suite de pruebas RLS en PostgreSQL
├── render.yaml                    # Configuración de infraestructura en Render PaaS
├── CATALOGO_PRODUCTO.md           # Definición comercial de informes y planes (Aprobado)
└── package.json                   # Dependencias y scripts del proyecto (pnpm)
```

---

## 4. Estado de la Codificación y Funcionalidades Construidas

| Componente / Módulo | Estado | Descripción de lo Construido |
| --- | --- | --- |
| **Pipeline Copernicus CDSE** | **Completado** | Autenticación OAuth2 con caché de tokens. Búsqueda STAC Catalog con filtro CQL2. Cálculo de NDVI mediante Statistical API con enmascaramiento de nubes SCL. |
| **Ecosistema Agentes IA** | **Completado** | 1 Orquestador Central + 6 Especialistas (Datos, Clima, Genética, Nutrición, Sanidad, Gestión). Evaluación de confianza y trazabilidad en `/dashboard/agente`. |
| **Landing Page 3D** | **Completado** | Visualización interactiva 3D con 8 satélites orbitando alrededor de la Tierra, rayos láser de escaneo en tiempo real y botón de acceso directo a `/login`. |
| **Autenticación Web** | **Completado** | Integración con Supabase Auth (OAuth2 Google + Email/Password + Botón Demo Admin rápido). |
| **Estación de Trabajo EO Browser** | **Completado** | Filtros avanzados por misión: Sentinel-1 (modos SAR, polarizaciones, órbita), Sentinel-2 (L1C/L2A, slider de nubosidad 0-100%, índices espectrales), Sentinel-3 (OLCI/SLSTR). |
| **Registro Histórico de Escenas** | **Completado** | Tabla interactiva de escenas históricas con filtros temporales, métricas clave y exportación en formato CSV en `/dashboard/copernicus/historico`. |
| **Perfiles por Vertical Industrial** | **Completado** | Personalización de reportes según vertical (`forestal`, `acuicola`, `agricola`, `ganadero`, `fruticola`) en `/dashboard/perfil`. |
| **Centro de Informes & Mapa** | **Completado** | Visualización de tarjetas de predios con promedios NDVI, porcentaje de nubosidad, badge de confianza y renderizado bajo demanda del mapa espacial. |
| **Seguridad Multi-tenant REST API** | **Completado** | Middleware Express `authenticateSupabaseJWT` valida tokens JWT y extrae `tenant_id` y `role` de `app_metadata`. Pruebas en `server/api-v1.test.ts`. |
| **Pruebas Automatizadas** | **Completado** | 27 pruebas unitarias e integración en Vitest pasando al 100% en 5 archivos de prueba. |

---

## 5. Tareas Pendientes para Paso a Producción

### A. Configuración de Variables de Entorno en Infraestructura Real
1. **Render (Backend API):** Configurar los secretos privados en el panel de Render:
   - `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` (obtención de credenciales de producción en CDSE).
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (instancia de producción en Supabase Cloud).
   - `OPENAI_API_KEY` (para respuestas enriquecidas con LLM en el ecosistema de agentes).
2. **Vercel (Frontend SPA):** Configurar variables públicas `VITE_*`:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   - `VITE_MAPBOX_TOKEN` (para la renderización de mapas de alta resolución en MapLibre/Mapbox).

### B. Integración Comercial y Cobro (SaaS Subscriptions)
1. Conectar webhooks de Stripe/MercadoPago a los endpoints `/api/v1/eventos_pago` para la actualización automática de cuotas de hectáreas por plan (Piloto, PyME, Región).
2. Implementar alerta automática cuando el usuario alcanza el 90% del límite de hectáreas contratadas.

### C. Alertas en Tiempo Real y Notificaciones
1. Implementar servicio de notificaciones Push / Email cuando Sentinel-2 procese un nuevo pase sobre un predio registrado y detecte una caída brusca de NDVI (> 0.15).

---

## 6. Verificación del Build y Salud del Código

- **pnpm check:** `0 errores` (Verificación estricta de TypeScript con `tsc --noEmit`).
- **pnpm test:** `27/27 pruebas pasadas` en Vitest (100% éxito).
- **pnpm build:** Bundle de producción generado exitosamente en `dist/` (`vite build` + `esbuild`).
