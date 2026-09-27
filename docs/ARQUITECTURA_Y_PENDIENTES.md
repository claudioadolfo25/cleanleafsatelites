# Arquitectura, Estructura Actual y Hoja de Ruta AgroPulso / Cleanleaf

**Versión:** 1.3.0
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
5. Gestionar clientes, usuarios, invitaciones y eventos de pago mediante la **Consola de Control Administrador (`/dashboard/admin`)**.

---

## 2. Variables de Entorno Requeridas por Entorno

### A. Frontend (Vercel SPA)
- `VITE_SUPABASE_URL`: URL del proyecto Supabase (Ej: `https://xyz.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Clave pública Anon de Supabase.
- `VITE_API_BASE_URL`: URL base de la API REST v1 (`/api/v1` o `https://agropulso-api.onrender.com/api/v1`).
- `VITE_ENABLE_DEMO_AUTH`: `false` en producción/staging; `true` para habilitar el botón Admin Demo en pruebas.

### B. Backend (Render / Railway API)
- `SUPABASE_URL`: URL del proyecto Supabase para verificación de firmas JWKS.
- `SUPABASE_ANON_KEY`: Clave pública Anon.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave Service Role privada (exclusiva del servidor).
- `ALLOWED_ORIGINS`: Lista separada por comas de dominios CORS permitidos (Ej: `https://agropulso.vercel.app`).
- `COPERNICUS_CLIENT_ID`: Client ID OAuth2 registrado en Copernicus CDSE.
- `COPERNICUS_CLIENT_SECRET`: Client Secret OAuth2 registrado en Copernicus CDSE.
- `OPENAI_API_KEY`: Clave API para respuestas enriquecidas en agentes IA.

---

## 3. Resoluciones Recientes & Estado del Alcance

| Módulo / Funcionalidad | Estado | Detalle Técnico de la Solución |
| --- | --- | --- |
| **Panel Administrador UI** | **Implementado y Probado** | Creada consola de control en `/dashboard/admin` con gestión de tenants, asignación de roles, invitaciones, bitácora de auditoría y webhooks de pago. |
| **Enrutamiento y Menú Admin** | **Implementado y Probado** | Ruta protegida en `App.tsx` y enlace con ícono de escudo en `DashboardLayout.tsx` visible condicionalmente para roles administrativos. |
| **Propagación Token Demo** | **Resuelto** | `authContext.tsx` y `apiClient.ts` inyectan el token JWT demo (`__AGROPULSO_DEMO_TOKEN__`) en las llamadas HTTP cuando opera en modo Demo. |
| **Normalización validPixelRatio** | **Resuelto** | `orchestrator.ts` normaliza automáticamente valores porcentuales (>1, ej: 95 -> 0.95) evitando errores de escala en píxeles claros. |
| **Parámetros Agente Dinámicos** | **Resuelto** | `AgentPage.tsx` extrae dinámicamente el perfil del usuario (hectáreas, región, vertical) y la configuración activa de filtros satelitales. |
| **Permisos de Gestión de Roles** | **Resuelto** | `POST /api/v1/roles` requiere explícitamente jerarquía autorizada y bloquea asignaciones cruzadas entre tenants. |
| **Persistencia Auditoría Agentes** | **Resuelto** | `POST /api/v1/agent/orchestrate` registra las consultas consolidadas con su `correlation_id` en la bitácora del tenant. |

---

## 4. Estructura de Directorios del Repositorio

```
cleanleafsatelites/
├── client/                        # Frontend Single Page Application (SPA)
│   ├── index.html                 # Punto de entrada HTML
│   ├── vite.config.ts             # Configuración Vite (build outDir: dist)
│   └── src/
│       ├── App.tsx                # Enrutador principal de React con /dashboard/admin
│       ├── components/            # Componentes reutilizables
│       │   ├── ProtectedRoute.tsx # Guardián de rutas privadas
│       │   ├── DashboardLayout.tsx# Layout principal con ícono Admin
│       │   └── FloatingAgentWidget.tsx # Widget flotante interactivo del Agente IA
│       ├── lib/                   # Clientes e integración de servicios
│       │   ├── apiClient.ts       # Cliente HTTP centralizado inyectando Bearer JWT
│       │   ├── authContext.tsx    # Proveedor de autenticación de sesión Supabase
│       │   ├── supabaseClient.ts  # Cliente Supabase JS con fail-fast en prod
│       │   └── userProfile.ts     # Gestión de perfil local y vertical industrial
│       └── pages/                 # Vistas principales de la plataforma
│           ├── AdminDashboardPage.tsx # Consola de Administración Operativa (/dashboard/admin)
│           ├── AgentPage.tsx      # Consulta dinámica a /api/v1/agent/orchestrate
│           ├── AuthPage.tsx       # Inicio de sesión (Google OAuth + Email/Password)
│           ├── CopernicusWorkstationPage.tsx # Estación de Trabajo Satelital EO Browser
│           ├── CopernicusHistoryPage.tsx     # Registro histórico de escenas satelitales
│           ├── GuideInterpreterPage.tsx     # Guía interactiva de interpretación
│           ├── Home.tsx            # Resumen del Dashboard
│           ├── Landing3DPage.tsx   # Landing page 3D con satélites orbitando
│           ├── ProfilePage.tsx     # Configuración de perfil y verticales
│           ├── ReportsDashboard.tsx# Centro de Informes satelitales
│           └── SupportPage.tsx    # Mesa de ayuda y soporte técnico
├── server/                        # Backend REST API Node.js / Express
│   ├── _core/
│   │   └── index.ts               # Servidor HTTP Express daemon con CORS seguro
│   ├── middleware/
│   │   └── auth.ts                # Middleware de validación de Supabase JWT
│   ├── routes/
│   │   └── api-v1.ts              # Router REST v1 con /agent/orchestrate y roles
│   ├── services/                  # Servicios de integración externa
│   │   ├── copernicus-auth.ts     # Gestión y cache de tokens OAuth2 CDSE
│   │   ├── copernicus-orchestrator.ts # Orquestador de análisis 3 pasos CDSE
│   │   ├── orchestrator.ts        # Orquestador con validPixelRatio normalizado
│   │   └── specialists.ts         # Motor de 6 Especialistas Agronómicos
│   └── admin/
│       └── supabase-client.ts     # Cliente Supabase Service Role para administración
├── shared/                        # Módulos y tipos compartidos entre Client y Server
│   ├── domain-agents.ts           # Definición de schemas y tipos de los 7 Agentes
│   ├── satellite-catalog.ts       # Catálogo de misiones satelitales (Sentinel-1/2/3)
│   └── types.ts                   # Catálogo unificado de Roles y Entidades
└── package.json                   # Dependencias y scripts del proyecto (pnpm)
```

---

## 5. Verificación de Salud del Código

- **pnpm check:** `0 errores` (Verificación estricta de TypeScript con `tsc --noEmit`).
- **pnpm test:** `27/27 pruebas pasadas` en Vitest (100% éxito).
- **pnpm build:** Bundle de producción generado exitosamente en `dist/` (`vite build` + `esbuild`).
