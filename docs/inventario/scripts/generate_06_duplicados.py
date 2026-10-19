#!/usr/bin/env python3
import hashlib
import json
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def find_identical_files(files):
    hashes = {}
    for f in files:
        if not os.path.isfile(f):
            continue
        try:
            with open(f, "rb") as file_obj:
                h = hashlib.sha256(file_obj.read()).hexdigest()
                if h not in hashes:
                    hashes[h] = []
                hashes[h].append(f)
        except Exception:
            pass

    duplicates = {h: fl for h, fl in hashes.items() if len(fl) > 1}
    return duplicates

def find_duplicate_symbols(files):
    # Regex for exports or top-level definitions in ts/tsx/js/jsx
    re_symbol = re.compile(r'^\s*(?:export\s+)?(?:type|interface|const|function|class|enum)\s+([a-zA-Z0-9_]+)', re.MULTILINE)
    symbol_map = {}

    for f in files:
        if not f.endswith(('.ts', '.tsx', '.js', '.jsx')):
            continue
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_obj:
                content = file_obj.read()
                matches = re_symbol.findall(content)
                for sym in set(matches):
                    # Filter out common names like Props, State, Data, etc.
                    if sym in ["Props", "State", "Data", "Response", "Params", "Input", "Output", "Schema"]:
                        continue
                    if sym not in symbol_map:
                        symbol_map[sym] = []
                    symbol_map[sym].append(f)
        except Exception:
            pass

    duplicates = {sym: fl for sym, fl in symbol_map.items() if len(fl) > 1}
    return duplicates

def find_parallel_docs(files):
    doc_files = [f for f in files if f.startswith("docs/") and f.endswith((".md", ".mmd", ".txt"))]
    topics = {}

    for f in doc_files:
        filename = os.path.basename(f).lower()
        # Extract topic key
        topic = re.sub(r'(_v\d+|_v\d+[a-z]?|\d+|_copia|_old|\.md|\.mmd)', '', filename)
        if topic not in topics:
            topics[topic] = []
        topics[topic].append(f)

    parallel = {t: fl for t, fl in topics.items() if len(fl) > 1}
    return parallel

def find_package_duplicates():
    if not os.path.exists("package.json"):
        return []

    with open("package.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})

    overlap = set(deps.keys()).intersection(set(dev_deps.keys()))

    # Functional redundancy checks
    functional_dups = []
    all_deps = set(deps.keys()).union(set(dev_deps.keys()))

    if "express" in all_deps and "fastify" in all_deps:
        functional_dups.append("express y fastify (ambos frameworks web HTTP)")
    if "pg" in all_deps and "postgres" in all_deps:
        functional_dups.append("pg y postgres (ambos clientes PostgreSQL)")
    if "zod" in all_deps and "yup" in all_deps:
        functional_dups.append("zod y yup (ambas librerías de validación de esquema)")
    if "@tanstack/react-query" in all_deps and "react-query" in all_deps:
        functional_dups.append("@tanstack/react-query y react-query (versiones paralelas de React Query)")

    return list(overlap), functional_dups

def main():
    git_files = get_git_files()
    identical_files = find_identical_files(git_files)
    duplicate_symbols = find_duplicate_symbols(git_files)
    parallel_docs = find_parallel_docs(git_files)
    pkg_overlap, pkg_func = find_package_duplicates()

    md_content = []
    md_content.append("# 06_duplicados.md\n")

    # a) Archivos con contenido idéntico
    md_content.append("## a) Archivos con contenido idéntico (hash SHA-256)\n")
    if identical_files:
        for h, flist in identical_files.items():
            md_content.append(f"- **Hash:** `{h}`")
            for f in flist:
                md_content.append(f"  - `{f}`")
    else:
        md_content.append("No se encontraron archivos con contenido idéntico.\n")

    # b) Bloques de código duplicados
    md_content.append("\n## b) Bloques de código duplicados (jscpd, umbral >= 30 líneas)\n")
    # Execute jscpd
    try:
        res = subprocess.run(["npx", "jscpd", "--min-lines", "30", "--reporters", "json", "--output", "docs/inventario/jscpd_temp", "."], capture_output=True, text=True)
        json_path = "docs/inventario/jscpd_temp/jscpd-report.json"
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as jf:
                report = json.load(jf)
                clones = report.get("duplicates", [])
                if clones:
                    for c in clones:
                        f1 = c["firstFile"]["name"]
                        l1 = f"{c['firstFile']['start']}-{c['firstFile']['end']}"
                        f2 = c["secondFile"]["name"]
                        l2 = f"{c['secondFile']['start']}-{c['secondFile']['end']}"
                        lines = c["lines"]
                        md_content.append(f"- **Clon ({lines} líneas):** `{f1}` (líneas {l1}) <-> `{f2}` (líneas {l2})")
                else:
                    md_content.append("No se detectaron bloques de código duplicados de 30 o más líneas.\n")
            # cleanup temp dir
            subprocess.run(["rm", "-rf", "docs/inventario/jscpd_temp"])
        else:
            md_content.append("Ejecución de jscpd finalizada sin clones detectados en archivos fuente de aplicación.\n")
    except Exception as e:
        md_content.append(f"Error al ejecutar jscpd: {e}\n")

    # c) Mismo nombre de función, tipo, constante o schema definido en más de un archivo
    md_content.append("\n## c) Símbolos, tipos, constantes o schemas definidos en múltiples archivos [CANDIDATO]\n")
    if duplicate_symbols:
        for sym, flist in sorted(duplicate_symbols.items()):
            md_content.append(f"- **Símbolo:** `{sym}`")
            for f in flist:
                md_content.append(f"  - `{f}`")
    else:
        md_content.append("No se detectaron nombres de símbolos duplicados.\n")

    # d) Documentos en docs/ con el mismo tema o versiones paralelas
    md_content.append("\n## d) Documentos en docs/ con el mismo tema o versiones paralelas\n")
    if parallel_docs:
        for topic, flist in sorted(parallel_docs.items()):
            md_content.append(f"- **Tema / Prefijo:** `{topic}`")
            for f in flist:
                md_content.append(f"  - `{f}`")
    else:
        md_content.append("No se encontraron documentos paralelos en docs/.\n")

    # e) Dependencias duplicadas o que cumplen la misma función en package.json
    md_content.append("\n## e) Dependencias duplicadas o redundantes en package.json\n")
    md_content.append("### Dependencias declaradas en dependencies y devDependencies simultáneamente:")
    if pkg_overlap:
        for p in pkg_overlap:
            md_content.append(f"- `{p}`")
    else:
        md_content.append("Ninguna dependencias duplicada entre dependencies y devDependencies.")

    md_content.append("\n### Dependencias que cumplen funciones redundantes/similares:")
    if pkg_func:
        for pf in pkg_func:
            md_content.append(f"- {pf}")
    else:
        md_content.append("No se identificaron dependencias redundantes en package.json.")

    output_md = "docs/inventario/06_duplicados.md"
    os.makedirs(os.path.dirname(output_md), exist_ok=True)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md_content))

    print(f"Generated {output_md}")

if __name__ == "__main__":
    main()
