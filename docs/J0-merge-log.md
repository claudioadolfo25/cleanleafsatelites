# Registro de Fusión J0 (Merge Conflict Log)
**Base:** `c503d4b661f38e88e54869ad98cded6313352258`
**Rama Agro:** `ae05c44`
**Rama Admin:** `ddaa022`

---

## Conflictos de Fusión Resueltos File-by-File

1. **`client/index.html`**
   - *Conflicto:* Conflicto de scripts unbundled de Umami analytics.
   - *Resolución:* Mantenido HTML limpio con `<div id="root"></div>` y `<script type="module" src="/src/main.tsx"></script>` para eliminar advertencias en Vite build.

2. **`client/src/App.tsx`**
   - *Conflicto:* Solapamiento de rutas de dashboard agrícola vs Admin Console `/dashboard/admin`.
   - *Resolución:* Unificadas ambas declaraciones de rutas y envoltorios `ProtectedRoute`.

3. **`client/src/components/DashboardLayout.tsx`**
   - *Conflicto:* Navegación lateral estándar vs navegación con ícono condicional para el Panel Administrador.
   - *Resolución:* Mantenida la estructura unificada con ícono Shield visible únicamente para roles `admin`, `owner`, `super_admin`.

4. **`client/src/components/SolicitudAnalisisForm.tsx`**
   - *Conflicto:* Lógica de BBox dinámico e inyección de filtros satelitales.
   - *Resolución:* Conservados los presets regionales (Araucanía, Valle Central) y cálculo automático de polígonos.

5. **`client/src/main.tsx`**
   - *Conflicto:* Configuración de QueryClient y Wouter router.
   - *Resolución:* Unificada la inicialización de React 19 y QueryClient.

6. **`client/src/pages/Home.tsx` y `ReportDetail.tsx`**
   - *Conflicto:* Vistas de resumen agrícola vs tarjetas de administración.
   - *Resolución:* Mantenidas las métricas NDVI, insignias de trazabilidad y gráfico de vegetación.

7. **`client/src/pages/ReportsDashboard.tsx` y `SatelliteConfiguration.tsx`**
   - *Conflicto:* Filtros de satélite (Sentinel-1/2/3) y controles de mapa.
   - *Resolución:* Mantenidos los selectores multi-satélite y filtros de nubosidad.

8. **`server/_core/index.ts`**
   - *Conflicto:* Inicialización de Express y CORS headers.
   - *Resolución:* Mantenida la configuración con middleware JWT Supabase y CORS `Vary: Origin`.

9. **`server/satellite-domain.test.ts` y `shared/types.ts`**
   - *Conflicto:* Catálogo de tipos de usuario y 27 tests de dominio agrícola.
   - *Resolución:* Conservado el catálogo unificado de roles (`super_admin`, `owner`, `admin`, `admin_tenant`, `agronomo`, `agricultor`, `viewer`) y todas las suites de prueba.

10. **`vite.config.ts` y `package.json`**
    - *Conflicto:* Aliases de path y dependencias de proyecto.
    - *Resolución:* Unificados los aliases `@`, `@shared`, `@assets` e instaladas las dependencias del catálogo unificado.
