#!/usr/bin/env python3
import csv
import os
import re

def find_trpc_in_file(filepath):
    if not os.path.exists(filepath):
        return []

    trpc_calls = set()
    pattern = re.compile(r'trpc\.([a-zA-Z0-9_\.]+)\.(useQuery|useMutation|useSubscription|useUtils|query|mutate)')

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            matches = pattern.findall(content)
            for m in matches:
                trpc_calls.add(m[0])
    except Exception:
        pass

    return sorted(list(trpc_calls))

def get_component_info(comp_name):
    pages_path = f"client/src/pages/{comp_name}.tsx"
    components_path = f"client/src/components/{comp_name}.tsx"

    if os.path.exists(pages_path):
        return pages_path, "page"
    elif os.path.exists(components_path):
        return components_path, "component"
    return None, None

def find_component_line_in_app(comp_name):
    app_file = "client/src/App.tsx"
    if not os.path.exists(app_file):
        return "client/src/App.tsx:1"

    with open(app_file, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            if comp_name in line:
                return f"client/src/App.tsx:{idx}"
    return "client/src/App.tsx:1"

def main():
    # Defined routes in App.tsx
    # Format: (path, component_name, guard)
    app_routes = [
        ("/", "LandingPage", "ninguno"),
        ("/auth", "AuthPage", "ninguno"),
        ("/auth/restablecer-password", "ResetPasswordPage", "ninguno"),
        ("/satelites", "SatellitesPlaceholderPage", "ninguno"),
        ("/dashboard", "Home", "ProtectedRoute"),
        ("/dashboard/admin", "AdminDashboardPage", "ProtectedRoute"),
        ("/dashboard/perfil", "ProfilePage", "ProtectedRoute"),
        ("/dashboard/predios", "PrediosPage", "ProtectedRoute"),
        ("/dashboard/configuracion/satelites", "SatelliteConfiguration", "ProtectedRoute"),
        ("/dashboard/informes/:id", "ReportDetail", "ProtectedRoute"),
        ("/dashboard/informes", "ReportsDashboard", "ProtectedRoute"),
        ("/404", "NotFound", "ninguno"),
        ("*", "NotFound", "ninguno"),
    ]

    route_rows = []
    processed_files = set()

    # Subcomponents used inside specific pages
    page_subcomponents = {
        "Home": ["SolicitudAnalisisForm", "CopernicusResourcePanel", "VariableChart", "AIChatBox", "ReportDownloadActions"],
        "ReportDetail": ["VariableChart", "ReportDownloadActions", "Map"],
        "PrediosPage": ["SolicitudAnalisisForm"],
        "ReportsDashboard": ["ReportDownloadActions"],
    }

    for path, comp_name, guard in app_routes:
        file_path, comp_type = get_component_info(comp_name)
        if not file_path:
            continue

        processed_files.add(file_path)
        app_line = find_component_line_in_app(comp_name)

        # Collect tRPC procedures in page and its subcomponents
        trpc_procs = find_trpc_in_file(file_path)
        sub_comps = page_subcomponents.get(comp_name, [])
        for sub in sub_comps:
            sub_path, _ = get_component_info(sub)
            if sub_path:
                processed_files.add(sub_path)
                trpc_procs.extend(find_trpc_in_file(sub_path))

        trpc_procs_unique = sorted(list(set(trpc_procs)))
        trpc_str = "; ".join(trpc_procs_unique) if trpc_procs_unique else "ninguno"

        route_rows.append({
            "ruta": path,
            "componente": comp_name,
            "archivo:linea": app_line,
            "guard": guard,
            "usa_procedimientos_trpc": trpc_str
        })

    # Find unrouted pages and components in client/src/pages and client/src/components
    all_candidate_dirs = ["client/src/pages", "client/src/components"]
    for cdir in all_candidate_dirs:
        if os.path.exists(cdir):
            for file in sorted(os.listdir(cdir)):
                if file.endswith(".tsx") and not file.endswith(".test.tsx"):
                    filepath = os.path.join(cdir, file).replace("\\", "/")
                    if filepath not in processed_files:
                        comp_name = os.path.splitext(file)[0]
                        trpc_procs = find_trpc_in_file(filepath)
                        trpc_str = "; ".join(trpc_procs) if trpc_procs else "ninguno"

                        route_rows.append({
                            "ruta": "sin_ruta_asignada",
                            "componente": comp_name,
                            "archivo:linea": f"{filepath}:1",
                            "guard": "no_aplica",
                            "usa_procedimientos_trpc": trpc_str
                        })

    output_csv = "docs/inventario/03_rutas_frontend.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "ruta",
            "componente",
            "archivo:linea",
            "guard",
            "usa_procedimientos_trpc"
        ])

        for r in route_rows:
            writer.writerow([
                r["ruta"],
                r["componente"],
                r["archivo:linea"],
                r["guard"],
                r["usa_procedimientos_trpc"]
            ])

    print(f"Generated {output_csv} with {len(route_rows)} rows.")

if __name__ == "__main__":
    main()
