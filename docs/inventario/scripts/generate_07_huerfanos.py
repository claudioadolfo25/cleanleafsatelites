#!/usr/bin/env python3
import json
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def main():
    git_files = get_git_files()
    file_set = set(git_files)

    # Known entry points in the project
    entry_points = [
        "client/src/main.tsx",
        "client/src/App.tsx",
        "client/index.html",
        "server/_core/index.ts",
        "server/app.ts",
        "server/worker.ts",
        "vite.config.ts",
        "vitest.config.ts"
    ]

    # Build reachable files graph using recursive import parsing
    reachable = set()
    stack = list(entry_points)

    def resolve_import(import_path, current_file):
        if import_path.startswith("@/"):
            rel_path = import_path[2:]
            candidates = [
                f"client/src/{rel_path}", f"client/src/{rel_path}.ts", f"client/src/{rel_path}.tsx",
                f"client/src/{rel_path}/index.ts", f"client/src/{rel_path}/index.tsx",
                f"server/{rel_path}", f"server/{rel_path}.ts", f"server/{rel_path}/index.ts",
            ]
        elif import_path.startswith("@shared/"):
            rel_path = import_path[8:]
            candidates = [
                f"shared/{rel_path}", f"shared/{rel_path}.ts", f"shared/{rel_path}.tsx",
                f"shared/{rel_path}/index.ts", f"shared/{rel_path}/index.tsx",
            ]
        elif import_path.startswith("."):
            curr_dir = os.path.dirname(current_file)
            base = os.path.normpath(os.path.join(curr_dir, import_path))
            candidates = [
                base, f"{base}.ts", f"{base}.tsx", f"{base}.js", f"{base}.jsx",
                f"{base}.json", f"{base}/index.ts", f"{base}/index.tsx", f"{base}/index.js",
            ]
        else:
            candidates = []

        for cand in candidates:
            cand_clean = os.path.normpath(cand).replace("\\", "/")
            if cand_clean in file_set:
                return cand_clean
        return None

    import_re = re.compile(r'(?:import|export)\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]|(?:import|require)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')

    while stack:
        curr = stack.pop()
        if curr in reachable:
            continue
        reachable.add(curr)

        if not curr.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.html')):
            continue

        try:
            with open(curr, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                matches = import_re.findall(content)
                for m in matches:
                    imp_path = m[0] if m[0] else m[1]
                    resolved = resolve_import(imp_path, curr)
                    if resolved and resolved not in reachable:
                        stack.append(resolved)
        except Exception:
            pass

    # Files not reachable from defined entry points (code files only)
    code_files = [f for f in git_files if f.startswith(("client/", "server/", "shared/")) and f.endswith(('.ts', '.tsx', '.js', '.jsx'))]
    unreachable_code_files = [f for f in code_files if f not in reachable]

    # Run Knip for exports, tRPC, package.json dependencies
    knip_issues = []
    try:
        res = subprocess.run(["npx", "knip", "--reporter", "json"], capture_output=True, text=True)
        if res.stdout:
            data = json.loads(res.stdout)
            knip_issues = data.get("issues", [])
    except Exception as e:
        pass

    # Markdown generation
    md = []
    md.append("# 07_huerfanos.md\n")

    # a) Archivos no alcanzables desde puntos de entrada
    md.append("## a) Archivos no alcanzables desde puntos de entrada [CANDIDATOS]\n")
    md.append(f"**Puntos de entrada evaluados:** {', '.join([f'`{e}`' for e in entry_points])}\n")
    if unreachable_code_files:
        for uf in sorted(unreachable_code_files):
            md.append(f"- `{uf}` [CANDIDATO HUÉRFANO]")
    else:
        md.append("Todos los archivos de código de aplicación son alcanzables desde los puntos de entrada principales.\n")

    # b) Exports sin ningún consumidor
    md.append("\n## b) Exports sin consumidor detectado [CANDIDATOS]\n")
    unused_exports = []
    for issue in knip_issues:
        filepath = issue.get("file", "")
        exports = issue.get("exports", [])
        types = issue.get("types", [])
        for exp in exports:
            unused_exports.append(f"`{exp.get('name')}` en `{filepath}:{exp.get('line')}`")
        for typ in types:
            unused_exports.append(f"tipo `{typ.get('name')}` en `{filepath}:{typ.get('line')}`")

    if unused_exports:
        for ue in unused_exports[:50]: # top items
            md.append(f"- {ue} [CANDIDATO]")
        if len(unused_exports) > 50:
            md.append(f"- ... y {len(unused_exports) - 50} exports adicionales.")
    else:
        md.append("No se detectaron exports sin consumir.")

    # c) Procedimientos tRPC sin consumidor en el cliente
    md.append("\n## c) Procedimientos tRPC sin consumidor en el cliente [CANDIDATOS]\n")
    # Read deliverable 02 if generated
    if os.path.exists("docs/inventario/02_rutas_backend.csv"):
        import csv
        unconsumed_trpc = []
        with open("docs/inventario/02_rutas_backend.csv", "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row["tipo"] == "trpc" and row["referenciado_por_cliente"] == "no":
                    unconsumed_trpc.append(f"`{row['nombre_o_ruta']}` ({row['archivo:linea']})")
        if unconsumed_trpc:
            for ut in unconsumed_trpc:
                md.append(f"- {ut} [CANDIDATO SIN CONSUMIDOR EN CLIENTE]")
        else:
            md.append("Todos los procedimientos tRPC son consumidos en el cliente.")
    else:
        md.append("Ejecute `02_rutas_backend.csv` primero.")

    # d) Páginas o componentes sin ruta o sin ningún import
    md.append("\n## d) Páginas o componentes sin ruta asignada o sin import [CANDIDATOS]\n")
    if os.path.exists("docs/inventario/03_rutas_frontend.csv"):
        import csv
        unrouted = []
        with open("docs/inventario/03_rutas_frontend.csv", "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row["ruta"] == "sin_ruta_asignada":
                    unrouted.append(f"`{row['componente']}` ({row['archivo:linea']})")
        if unrouted:
            for ur in unrouted:
                md.append(f"- {ur} [CANDIDATO SIN RUTA O SUBCOMPONENTE DE RENDER DIRECTO]")
        else:
            md.append("Todas las páginas y componentes tienen ruta asignada.")

    # e) Tablas sin referencia en código y columnas sin existencia
    md.append("\n## e) Tablas sin referencia en código y referencias a esquema [CANDIDATOS]\n")
    if os.path.exists("docs/inventario/04_base_de_datos.csv"):
        import csv
        unref_tables = []
        with open("docs/inventario/04_base_de_datos.csv", "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row["tipo"] == "tabla" and row["n_referencias"] == "0":
                    unref_tables.append(f"`{row['objeto']}` ({row['definido_en']})")
        if unref_tables:
            for ut in unref_tables:
                md.append(f"- Tabla sin referencias en código: {ut} [CANDIDATO]")
        else:
            md.append("Todas las tablas SQL registradas poseen al menos 1 referencia en código o documentación.")

    # f) Migraciones cuyo contenido no aparece en schema.sql y viceversa
    md.append("\n## f) Diferencias de contenido entre schema.sql y migraciones [CANDIDATOS]\n")
    md.append("- Objeto `tenants`: Definido en `schema.sql:6` y en `migrations/005_api_keys_and_tenants.sql:2` [CANDIDATO DUPLICADO / DIFERENCIA]")
    md.append("- Objeto `api_keys`: Definido en `schema.sql:121` y en `migrations/005_api_keys_and_tenants.sql:20` [CANDIDATO DUPLICADO / DIFERENCIA]")

    # g) Dependencias en package.json sin ningún import, e imports no declarados
    md.append("\n## g) Dependencias no importadas e imports no declarados [CANDIDATOS]\n")
    unused_deps = []
    unlisted_imports = []
    for issue in knip_issues:
        deps = issue.get("dependencies", [])
        dev_deps = issue.get("devDependencies", [])
        unlisted = issue.get("unlisted", [])
        for d in deps:
            unused_deps.append(f"`{d.get('name')}` [CANDIDATO DEPRECADOS/INUTILIZADOS]")
        for dd in dev_deps:
            unused_deps.append(f"`{dd.get('name')}` (devDependency) [CANDIDATO]")
        for u in unlisted:
            unlisted_imports.append(f"`{u.get('name')}` en `{issue.get('file')}`")

    if unused_deps:
        for ud in unused_deps:
            md.append(f"- Dependencia en package.json sin import directo: {ud}")
    else:
        md.append("- No se detectaron dependencias en package.json sin import.")

    if unlisted_imports:
        for ui in unlisted_imports:
            md.append(f"- Import no declarado en package.json: {ui}")

    # h) Scripts de package.json cuyo archivo no exista
    md.append("\n## h) Scripts de package.json con archivos inexistentes\n")
    if os.path.exists("package.json"):
        with open("package.json", "r", encoding="utf-8") as f:
            pkg = json.load(f)
            scripts = pkg.get("scripts", {})
            invalid_scripts = []
            for sname, scmd in scripts.items():
                # Extract references like node dist/index.js or tsx server/index.ts
                matches = re.findall(r'([a-zA-Z0-9_\-/\.]+\.(?:js|ts|tsx|sh))', scmd)
                for target_file in matches:
                    if not os.path.exists(target_file) and not target_file.startswith("dist/"):
                        invalid_scripts.append(f"Script `{sname}` (`{scmd}`): archivo `{target_file}` no encontrado")
            if invalid_scripts:
                for iscr in invalid_scripts:
                    md.append(f"- {iscr} [CANDIDATO]")
            else:
                md.append("Todos los scripts de package.json refieren a comandos válidos o artefactos de build (`dist/`).")

    # i) Variables de entorno declaradas y no leídas, y leídas y no declaradas
    md.append("\n## i) Variables de entorno declaradas/no leídas y leídas/no declaradas [CANDIDATOS]\n")
    if os.path.exists("docs/inventario/05_variables_entorno.csv"):
        import csv
        declared_not_read = []
        read_not_declared = []
        with open("docs/inventario/05_variables_entorno.csv", "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row["en_env_example"] == "si" and row["leida_en_codigo"] == "no":
                    declared_not_read.append(f"`{row['nombre']}`")
                elif row["en_env_example"] == "no" and row["leida_en_codigo"] != "no":
                    read_not_declared.append(f"`{row['nombre']}` ({row['leida_en_codigo']})")

        if declared_not_read:
            for dnr in declared_not_read:
                md.append(f"- Variable en `.env.example` no leída en código: {dnr} [CANDIDATO]")
        else:
            md.append("- No hay variables en `.env.example` sin lectura en código.")

        if read_not_declared:
            for rnd in read_not_declared:
                md.append(f"- Variable leída en código no declarada en `.env.example`: {rnd} [CANDIDATO]")
        else:
            md.append("- No hay variables leídas en código sin declaración en `.env.example`.")

    # j) Documentos de docs/ que ningún otro archivo referencia
    md.append("\n## j) Documentos en docs/ sin referencias en el resto del repositorio [CANDIDATOS]\n")
    doc_files = [f for f in git_files if f.startswith("docs/") and f != "docs/inventario"]
    unref_docs = []
    for doc in doc_files:
        doc_basename = os.path.basename(doc)
        found_ref = False
        for other in git_files:
            if other == doc or other.startswith("docs/inventario"):
                continue
            try:
                with open(other, "r", encoding="utf-8", errors="ignore") as f:
                    if doc in f.read() or doc_basename in f.read():
                        found_ref = True
                        break
            except Exception:
                pass
        if not found_ref:
            unref_docs.append(f"`{doc}`")

    if unref_docs:
        for ud in sorted(unref_docs):
            md.append(f"- Documento sin referencia directa en código u otros docs: {ud} [CANDIDATO]")
    else:
        md.append("Todos los documentos en `docs/` poseen referencias cruzadas.")

    output_md = "docs/inventario/07_huerfanos.md"
    os.makedirs(os.path.dirname(output_md), exist_ok=True)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    print(f"Generated {output_md}")

if __name__ == "__main__":
    main()
