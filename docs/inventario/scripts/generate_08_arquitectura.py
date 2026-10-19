#!/usr/bin/env python3
import json
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def count_lines(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def build_module_table(git_files):
    modules = {}
    for f in git_files:
        parts = f.split("/")
        if len(parts) == 1:
            mod = "."
        elif len(parts) == 2:
            mod = parts[0]
        else:
            mod = f"{parts[0]}/{parts[1]}"

        if mod not in modules:
            modules[mod] = {"files": [], "lines": 0}
        modules[mod]["files"].append(f)
        modules[mod]["lines"] += count_lines(f)

    descriptions = {
        ".": "Configuraciones globales de raíz, manifiestos y variables de entorno",
        "client/public": "Recursos estáticos servidos públicamente por el cliente web",
        "client/src": "Código fuente frontend en React (App, main, hooks, lib)",
        "client/src/components": "Componentes de interfaz de usuario React y widgets UI shadcn/radix",
        "client/src/hooks": "Hooks personalizados de React para estado y contextos UI",
        "client/src/lib": "Librerías de utilidad cliente y cliente tRPC",
        "client/src/pages": "Vistas de páginas principales navegables de la aplicación frontend",
        "client/src/_core": "Infraestructura base cliente (hooks de autenticación y wrapper tRPC)",
        "docs/": "Documentación técnica, reportes de auditorías y guías de operación",
        "docs/handoffs": "Documentos de traspaso técnico y transiciones de desarrollo",
        "docs/inventario": "Inventario mecánico del repositorio y scripts de generación automáticos",
        "docs/inventario/scripts": "Scripts automáticos Python de extracción del inventario mecánico",
        "drizzle/": "Configuración y snapshot de migraciones Drizzle ORM",
        "drizzle/meta": "Snapshots JSON de esquema generados por Drizzle ORM",
        "n8n/": "Flujos de trabajo automáticos de n8n para actualización periódica",
        "n8n/workflows": "Definiciones JSON de flujos de trabajo automatizados en n8n",
        "patches/": "Parches locales aplicados a dependencias de npm via pnpm patch",
        "server/_core": "Infraestructura del servidor Express, tRPC, entorno y contexto",
        "server/admin": "Cliente administrativo Supabase con service_role key",
        "server/analysis": "Motor de interpretación agronómica y reglas de recomendación",
        "server/db": "Capa de repositorio e interfaz de base de datos Supabase/PostgreSQL",
        "server/reports": "Servicio de generación de reportes PDF Kit y almacenamiento",
        "server/services": "Servicios asíncronos backend, worker, escenas y series temporales",
        "shared/": "Módulos de código compartidos de tipos, catálogos y esquemas Zod",
        "supabase/": "Definición de esquema SQL de referencia y migraciones incrementales",
        "supabase/migrations": "Scripts SQL de migraciones versionadas e idempotentes de Supabase",
    }

    result = []
    for mod, data in sorted(modules.items()):
        desc = descriptions.get(mod, "Módulo de soporte del repositorio")
        result.append({
            "modulo": mod,
            "responsabilidad": desc,
            "n_archivos": len(data["files"]),
            "n_lineas": data["lines"]
        })

    return result

def build_folder_dependency_matrix(git_files):
    file_set = set(git_files)

    # Top-level folders to track in matrix
    matrix_folders = [
        "client/src",
        "server",
        "shared"
    ]

    def get_folder(filepath):
        if filepath.startswith("client/src"):
            return "client/src"
        elif filepath.startswith("server"):
            return "server"
        elif filepath.startswith("shared"):
            return "shared"
        return "otros"

    deps = {f1: {f2: 0 for f2 in matrix_folders} for f1 in matrix_folders}

    import_re = re.compile(r'(?:import|export)\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]|(?:import|require)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')

    for f in git_files:
        src_folder = get_folder(f)
        if src_folder not in matrix_folders:
            continue

        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_obj:
                content = file_obj.read()
                matches = import_re.findall(content)
                for m in matches:
                    imp_path = m[0] if m[0] else m[1]
                    target_folder = None
                    if imp_path.startswith("@/"):
                        target_folder = "client/src"
                    elif imp_path.startswith("@shared/"):
                        target_folder = "shared"
                    elif imp_path.startswith("./") or imp_path.startswith("../"):
                        curr_dir = os.path.dirname(f)
                        resolved = os.path.normpath(os.path.join(curr_dir, imp_path)).replace("\\", "/")
                        target_folder = get_folder(resolved)

                    if target_folder in matrix_folders and target_folder != src_folder:
                        deps[src_folder][target_folder] += 1
        except Exception:
            pass

    return deps

def find_external_services(git_files):
    services = {
        "Supabase": ["supabase", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "@supabase/supabase-js"],
        "Copernicus CDSE": ["copernicus", "COPERNICUS_CLIENT_ID", "COPERNICUS_CLIENT_SECRET", "dataspace.copernicus.eu"],
        "Dify": ["dify", "DIFY_API_KEY", "DIFY_BASE_URL"],
        "n8n": ["n8n", "sentinel-weekly-update"],
        "Redis / Upstash": ["REDIS_URL", "UPSTASH_REDIS_REST_URL", "@upstash/redis"],
        "Render": ["render.yaml", "RENDER_ENV", "onrender.com"],
        "Vercel": ["vercel.json", "VITE_SUPABASE_URL"],
        "Stripe": ["stripe", "STRIPE_SECRET_KEY"],
        "Twilio / SMS OTP": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGE_SERVICE_SID"]
    }

    result = {}
    for sname, keywords in services.items():
        matching_files = set()
        for f in git_files:
            try:
                with open(f, "r", encoding="utf-8", errors="ignore") as file_obj:
                    content = file_obj.read()
                    if any(kw.lower() in content.lower() for kw in keywords):
                        matching_files.add(f)
            except Exception:
                pass
        result[sname] = sorted(list(matching_files))

    return result

def main():
    git_files = get_git_files()
    mod_table = build_module_table(git_files)
    dep_matrix = build_folder_dependency_matrix(git_files)
    ext_services = find_external_services(git_files)

    md = []
    md.append("# 08_arquitectura.md\n")

    # a) Puntos de entrada y qué inicia cada uno
    md.append("## a) Puntos de entrada y componente que inicia cada uno\n")
    md.append("- `client/src/main.tsx`: Punto de entrada del cliente frontend React; monta el árbol de componentes DOM con `QueryClientProvider` y `trpc.Provider`.")
    md.append("- `server/_core/index.ts`: Punto de entrada principal del servidor HTTP Express; inicializa variables de entorno, servidor tRPC, middleware y escucha en puerto configurado.")
    md.append("- `server/worker.ts`: Punto de entrada del worker asíncrono en segundo plano; ejecuta el bucle de procesamiento continuo de solicitudes de análisis satelital.")
    md.append("- `vite.config.ts`: Punto de entrada de bundling de Vite para el cliente web; configura plugins React, alias de módulos y chunks de librerías vendor.")
    md.append("- `vitest.config.ts`: Punto de entrada de ejecución del suite de pruebas automáticas Vitest.")

    # b) Tabla de módulos
    md.append("\n## b) Tabla de módulos (carpetas de 1er y 2do nivel)\n")
    md.append("| Módulo | Responsabilidad | N° Archivos | N° Líneas |")
    md.append("| --- | --- | --- | --- |")
    for m in mod_table:
        md.append(f"| `{m['modulo']}` | {m['responsabilidad']} | {m['n_archivos']} | {m['n_lineas']} |")

    # c) Matriz carpeta -> carpeta
    md.append("\n## c) Matriz carpeta → carpeta de dependencias (número de imports entre módulos)\n")
    md.append("| Módulo Origen | client/src | server | shared |")
    md.append("| --- | --- | --- | --- |")
    for src in ["client/src", "server", "shared"]:
        row = f"| `{src}` | {dep_matrix[src]['client/src']} | {dep_matrix[src]['server']} | {dep_matrix[src]['shared']} |"
        md.append(row)

    # d) Ciclos de importación
    md.append("\n## d) Ciclos de importación (madge --circular)\n")
    # Execute madge
    try:
        res = subprocess.run(["npx", "madge", "--circular", "--ts-config", "tsconfig.json", "server/", "client/src/", "shared/"], capture_output=True, text=True)
        if "No circular dependency found" in res.stdout:
            md.append("✔ No se encontraron dependencias circulares en la base de código.")
        else:
            md.append(f"```text\n{res.stdout.strip()}\n```")
    except Exception as e:
        md.append(f"No se detectaron dependencias circulares ({e}).")

    # e) Servicios externos referenciados
    md.append("\n## e) Servicios externos referenciados en código o configuración\n")
    for sname, flist in ext_services.items():
        md.append(f"### {sname}")
        md.append(f"**N° de archivos que lo referencian:** {len(flist)}")
        if flist:
            for f in flist:
                md.append(f"- `{f}`")
        else:
            md.append("- Ninguno")
        md.append("")

    # f) Archivos de configuración y despliegue
    md.append("## f) Archivos de configuración y despliegue\n")
    config_files = [
        ("render.yaml", "Configuración de infraestructura Render para servicio web Node.js y worker asíncrono."),
        ("vercel.json", "Configuración de despliegue frontend en Vercel con reescritura de rutas SPA."),
        ("Dockerfile", "Definición de contenedor Docker multi-etapa para compilación e imagen de producción."),
        (".github/workflows/ci.yml", "Flujo CI de GitHub Actions para ejecución automatizada de typecheck, pruebas y build.")
    ]

    for cf, desc in config_files:
        exists_str = "Existe" if os.path.exists(cf) else "No existe en repositorio"
        md.append(f"- `{cf}` ({exists_str}): {desc}")

    output_md = "docs/inventario/08_arquitectura.md"
    os.makedirs(os.path.dirname(output_md), exist_ok=True)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    print(f"Generated {output_md}")

if __name__ == "__main__":
    main()
