#!/usr/bin/env python3
import csv
import os
import re
import subprocess
from pathlib import Path

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def get_last_commit_date(filepath):
    res = subprocess.run(["git", "log", "-1", "--format=%cd", "--date=iso-strict", filepath], capture_output=True, text=True)
    return res.stdout.strip()

def count_lines(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def build_import_graph(files):
    file_set = set(files)
    # create mapping from module resolution targets to git file paths
    # e.g. shared/satellite-catalog -> shared/satellite-catalog.ts
    # @/components/ui/button -> client/src/components/ui/button.tsx
    # @db -> server/db/index.ts or shared/index.ts etc

    # Let's map imports in files to target files
    import_counts = {f: 0 for f in files} # imported_por_n_archivos
    export_counts = {f: 0 for f in files} # importa_n_archivos

    # Simple resolver helper
    def resolve_import(import_path, current_file):
        # Resolve aliases
        if import_path.startswith("@/"):
            rel_path = import_path[2:]
            candidates = [
                f"client/src/{rel_path}",
                f"client/src/{rel_path}.ts",
                f"client/src/{rel_path}.tsx",
                f"client/src/{rel_path}/index.ts",
                f"client/src/{rel_path}/index.tsx",
                f"server/{rel_path}",
                f"server/{rel_path}.ts",
                f"server/{rel_path}/index.ts",
            ]
        elif import_path.startswith("@shared/"):
            rel_path = import_path[8:]
            candidates = [
                f"shared/{rel_path}",
                f"shared/{rel_path}.ts",
                f"shared/{rel_path}.tsx",
                f"shared/{rel_path}/index.ts",
                f"shared/{rel_path}/index.tsx",
            ]
        elif import_path.startswith("."):
            curr_dir = os.path.dirname(current_file)
            base = os.path.normpath(os.path.join(curr_dir, import_path))
            candidates = [
                base,
                f"{base}.ts",
                f"{base}.tsx",
                f"{base}.js",
                f"{base}.jsx",
                f"{base}.json",
                f"{base}/index.ts",
                f"{base}/index.tsx",
                f"{base}/index.js",
            ]
        else:
            candidates = []

        for cand in candidates:
            cand_clean = os.path.normpath(cand).replace("\\", "/")
            if cand_clean in file_set:
                return cand_clean
        return None

    import_re = re.compile(r'(?:import|export)\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]|(?:import|require)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')

    for f in files:
        if not f.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.vue', '.css', '.scss')):
            continue
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_content:
                content = file_content.read()
                matches = import_re.findall(content)
                imported_targets = set()
                for m in matches:
                    imp_path = m[0] if m[0] else m[1]
                    resolved = resolve_import(imp_path, f)
                    if resolved and resolved != f:
                        imported_targets.add(resolved)

                export_counts[f] = len(imported_targets)
                for t in imported_targets:
                    import_counts[t] += 1
        except Exception as e:
            pass

    return import_counts, export_counts

def main():
    files = get_git_files()
    import_counts, export_counts = build_import_graph(files)

    output_csv = "docs/inventario/01_archivos.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "ruta",
            "carpeta_raiz",
            "extension",
            "lineas",
            "ultimo_commit_fecha",
            "importado_por_n_archivos",
            "importa_n_archivos"
        ])

        for f in files:
            parts = f.split("/", 1)
            carpeta_raiz = parts[0] if len(parts) > 1 else "."
            ext = os.path.splitext(f)[1]
            if not ext and f.startswith("."):
                ext = f
            lines = count_lines(f)
            last_commit = get_last_commit_date(f)
            imp_by = import_counts.get(f, 0)
            imp_n = export_counts.get(f, 0)

            writer.writerow([
                f,
                carpeta_raiz,
                ext,
                lines,
                last_commit,
                imp_by,
                imp_n
            ])

    print(f"Generated {output_csv} with {len(files)} rows.")

if __name__ == "__main__":
    main()
