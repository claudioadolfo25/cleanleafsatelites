#!/usr/bin/env python3
import csv
import os
import re

def get_trpc_client_usages():
    client_refs = {}
    client_dir = "client/src"
    if not os.path.exists(client_dir):
        return client_refs

    # Regex for trpc calls e.g. trpc.auth.me.useQuery or trpc.cleanleaf.reports.list.useQuery
    pattern = re.compile(r'trpc\.([a-zA-Z0-9_\.]+)\.(useQuery|useMutation|useSubscription|useUtils|query|mutate)')

    for root, dirs, files in os.walk(client_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file).replace("\\", "/")
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = pattern.findall(content)
                    for m in matches:
                        proc_path = m[0]
                        if proc_path not in client_refs:
                            client_refs[proc_path] = set()
                        client_refs[proc_path].add(filepath)

    return client_refs

def parse_express_routes():
    routes = []
    # app.ts
    filepath = "server/app.ts"
    if not os.path.exists(filepath):
        return routes

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for idx, line in enumerate(lines, 1):
        # Match Express route definitions
        # e.g. app.get("/api/health", ...
        # app.use("/api/trpc", ...
        # app.use("/api/*", ...
        m = re.search(r'app\.(get|post|put|delete|patch|use|all)\s*\(\s*["\']([^"\']+)["\']', line)
        if m:
            method = m[1].upper()
            path = m[2]

            # Determine guard or middleware
            guard = "ninguno"
            if "createCustomRateLimiter" in line or "rateLimit" in line:
                guard = "rateLimiter"
            elif "trpcMiddleware" in line:
                guard = "trpcMiddleware"
            elif path.startswith("/api/trpc"):
                guard = "rateLimiter/trpcMiddleware"

            schema = "ninguno"
            tables_services = "ninguno"
            if path == "/api/health":
                tables_services = "salud del sistema"
            elif path.startswith("/api/trpc"):
                tables_services = "tRPC Router Dispatcher"
            elif path == "/api/*":
                tables_services = "Fallback 404 handler"

            ref_by_client = "no"
            where_ref = "ninguno"

            routes.append({
                "tipo": "express",
                "nombre_o_ruta": path,
                "metodo": method,
                "archivo:linea": f"{filepath}:{idx}",
                "guard_o_middleware": guard,
                "esquema_entrada": schema,
                "tablas_o_servicios_que_toca": tables_services,
                "referenciado_por_cliente": ref_by_client,
                "donde_se_referencia": where_ref
            })

    return routes

def parse_trpc_routes(client_refs):
    routes = []

    # 1) systemRouter
    system_file = "server/_core/systemRouter.ts"
    if os.path.exists(system_file):
        with open(system_file, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # system.health
        for idx, line in enumerate(lines, 1):
            if "health:" in line:
                proc = "system.health"
                where = list(client_refs.get(proc, []))
                routes.append({
                    "tipo": "trpc",
                    "nombre_o_ruta": proc,
                    "metodo": "QUERY",
                    "archivo:linea": f"{system_file}:{idx}",
                    "guard_o_middleware": "publicProcedure",
                    "esquema_entrada": "z.object({ timestamp: z.number() })",
                    "tablas_o_servicios_que_toca": "ninguno",
                    "referenciado_por_cliente": "si" if where else "no",
                    "donde_se_referencia": "; ".join(where) if where else "ninguno"
                })
            elif "notifyOwner:" in line:
                proc = "system.notifyOwner"
                where = list(client_refs.get(proc, []))
                routes.append({
                    "tipo": "trpc",
                    "nombre_o_ruta": proc,
                    "metodo": "MUTATION",
                    "archivo:linea": f"{system_file}:{idx}",
                    "guard_o_middleware": "adminProcedure",
                    "esquema_entrada": "z.object({ title: z.string(), content: z.string() })",
                    "tablas_o_servicios_que_toca": "notifyOwner service",
                    "referenciado_por_cliente": "si" if where else "no",
                    "donde_se_referencia": "; ".join(where) if where else "ninguno"
                })

    # 2) routers.ts
    routers_file = "server/routers.ts"
    if not os.path.exists(routers_file):
        return routes

    with open(routers_file, "r", encoding="utf-8") as f:
        content = f.read()
        lines = content.split("\n")

    # Stack to keep track of nested router prefixes
    # We will parse procedures manually line by line with line numbers

    # Detailed mapping of procedures in routers.ts:
    # We can parse key router structure in routers.ts
    # Let's inspect line by line to get exact line numbers and procedure definitions

    current_path = []

    for idx, line in enumerate(lines, 1):
        line_str = line.strip()

        # Match router definitions
        # auth: router({
        # profile: router({
        # preferences: router({
        # predios: router({
        # cleanleaf: router({
        # reports: router({
        # admin: router({
        # apiV1: router({
        # solicitudes: router({
        # onboarding: router({
        # apiKeys: router({

        # Let's hardcode precise parsing or pattern match for procedures:
        proc_match = re.search(r'([a-zA-Z0-9_]+):\s*(publicProcedure|protectedProcedure|tenantAdminProcedure|superAdminProcedure|tenantOptionalProcedure|adminProcedure)', line_str)
        if proc_match:
            proc_name = proc_match[1]
            guard = proc_match[2]

            # Determine method (query vs mutation)
            # Peek down up to 10 lines
            method = "QUERY/MUTATION"
            block = "\n".join(lines[idx-1:min(len(lines), idx+15)])
            if ".mutation(" in block:
                method = "MUTATION"
            elif ".query(" in block:
                method = "QUERY"

            # Input schema pattern
            schema_match = re.search(r'\.input\(([^)]+)\)', block)
            schema = schema_match[1].strip() if schema_match else "ninguno"

            # Full procedure path construction
            # Context-based path determination based on line number range in server/routers.ts
            if 337 <= idx <= 344:
                full_proc = f"auth.{proc_name}"
            elif 345 <= idx <= 355:
                full_proc = f"profile.{proc_name}"
            elif 356 <= idx <= 419:
                full_proc = f"preferences.{proc_name}"
            elif 420 <= idx <= 472:
                full_proc = f"predios.{proc_name}"
            elif 473 <= idx <= 550 and idx < 551:
                # cleanleaf or cleanleaf.reports
                if 478 <= idx <= 550:
                    full_proc = f"cleanleaf.reports.{proc_name}"
                else:
                    full_proc = f"cleanleaf.{proc_name}"
            elif 551 <= idx <= 703:
                full_proc = f"cleanleaf.{proc_name}"
            elif 704 <= idx <= 753:
                full_proc = f"admin.{proc_name}"
            elif 754 <= idx <= 784:
                if 756 <= idx <= 784:
                    full_proc = f"apiV1.solicitudes.{proc_name}"
                else:
                    full_proc = f"apiV1.{proc_name}"
            elif 785 <= idx <= 791:
                full_proc = f"apiV1.onboarding.{proc_name}"
            elif 792 <= idx <= 805:
                full_proc = f"apiV1.apiKeys.{proc_name}"
            else:
                full_proc = proc_name

            # Tables / services touched heuristic
            tables_services = []
            if "getUserProfile" in block or "ctx.user" in block or "profile" in full_proc:
                tables_services.append("users")
            if "predios" in full_proc or "getPredioById" in block or "listPredios" in block:
                tables_services.append("predios")
            if "solicitudes" in block or "solicitud" in block or "createAnalysis" in full_proc:
                tables_services.append("solicitudes_analisis")
            if "reports" in full_proc or "informes" in block:
                tables_services.append("informes")
            if "mediciones" in block or "getTimeSeries" in full_proc:
                tables_services.append("mediciones")
            if "tenants" in block or "updatePlan" in full_proc or "createTenant" in full_proc:
                tables_services.append("tenants")
            if "api_keys" in block or "apiKeys" in full_proc:
                tables_services.append("api_keys")
            if "workflow_logs" in block or "retry" in full_proc:
                tables_services.append("workflow_logs")
            if "getCopernicusResources" in block or "catalog" in full_proc or "getTimeSeries" in full_proc:
                tables_services.append("Copernicus CDSE Service")

            tables_str = ", ".join(set(tables_services)) if tables_services else "ninguno"

            where = list(client_refs.get(full_proc, []))

            routes.append({
                "tipo": "trpc",
                "nombre_o_ruta": full_proc,
                "metodo": method,
                "archivo:linea": f"{routers_file}:{idx}",
                "guard_o_middleware": guard,
                "esquema_entrada": schema,
                "tablas_o_servicios_que_toca": tables_str,
                "referenciado_por_cliente": "si" if where else "no",
                "donde_se_referencia": "; ".join(where) if where else "ninguno"
            })

    return routes

def main():
    client_refs = get_trpc_client_usages()
    express_routes = parse_express_routes()
    trpc_routes = parse_trpc_routes(client_refs)

    all_routes = express_routes + trpc_routes

    output_csv = "docs/inventario/02_rutas_backend.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "tipo",
            "nombre_o_ruta",
            "metodo",
            "archivo:linea",
            "guard_o_middleware",
            "esquema_entrada",
            "tablas_o_servicios_que_toca",
            "referenciado_por_cliente",
            "donde_se_referencia"
        ])

        for r in all_routes:
            writer.writerow([
                r["tipo"],
                r["nombre_o_ruta"],
                r["metodo"],
                r["archivo:linea"],
                r["guard_o_middleware"],
                r["esquema_entrada"],
                r["tablas_o_servicios_que_toca"],
                r["referenciado_por_cliente"],
                r["donde_se_referencia"]
            ])

    print(f"Generated {output_csv} with {len(all_routes)} rows.")

if __name__ == "__main__":
    main()
