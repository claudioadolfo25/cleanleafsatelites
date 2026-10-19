#!/usr/bin/env python3
import csv
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def parse_sql_file(filepath):
    objects = []
    if not os.path.exists(filepath):
        return objects

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    # Regex patterns for objects
    re_table = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)', re.IGNORECASE)
    re_view = re.compile(r'CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?([a-zA-Z0-9_]+)', re.IGNORECASE)
    re_func = re.compile(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)', re.IGNORECASE)
    re_policy = re.compile(r'CREATE\s+POLICY\s+["\']?([^"\'\s]+)["\']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)', re.IGNORECASE)
    re_index = re.compile(r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)', re.IGNORECASE)
    re_bucket = re.compile(r'INSERT\s+INTO\s+storage\.buckets\s*.*VALUES\s*\(\s*["\']([^"\'\s]+)["\']', re.IGNORECASE)
    re_enable_rls = re.compile(r'ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', re.IGNORECASE)

    rls_tables = set()
    for line in lines:
        m_rls = re_enable_rls.search(line)
        if m_rls:
            rls_tables.add(m_rls.group(1))

    for idx, line in enumerate(lines, 1):
        m_t = re_table.search(line)
        if m_t:
            obj_name = m_t.group(1)
            objects.append({
                "objeto": obj_name,
                "tipo": "tabla",
                "definido_en": f"{filepath}:{idx}",
                "rls": "si" if obj_name in rls_tables else "no",
                "definition_str": line.strip()
            })
            continue

        m_v = re_view.search(line)
        if m_v:
            objects.append({
                "objeto": m_v.group(1),
                "tipo": "vista",
                "definido_en": f"{filepath}:{idx}",
                "rls": "no_aplica",
                "definition_str": line.strip()
            })
            continue

        m_f = re_func.search(line)
        if m_f:
            objects.append({
                "objeto": m_f.group(1),
                "tipo": "funcion",
                "definido_en": f"{filepath}:{idx}",
                "rls": "no_aplica",
                "definition_str": line.strip()
            })
            continue

        m_p = re_policy.search(line)
        if m_p:
            pol_name = m_p.group(1)
            tbl_name = m_p.group(2)
            objects.append({
                "objeto": f"{pol_name} ON {tbl_name}",
                "tipo": "politica",
                "definido_en": f"{filepath}:{idx}",
                "rls": "no_aplica",
                "definition_str": line.strip()
            })
            continue

        m_i = re_index.search(line)
        if m_i:
            objects.append({
                "objeto": m_i.group(1),
                "tipo": "indice",
                "definido_en": f"{filepath}:{idx}",
                "rls": "no_aplica",
                "definition_str": line.strip()
            })
            continue

        m_b = re_bucket.search(line)
        if m_b:
            objects.append({
                "objeto": m_b.group(1),
                "tipo": "bucket",
                "definido_en": f"{filepath}:{idx}",
                "rls": "no_aplica",
                "definition_str": line.strip()
            })
            continue

    return objects

def search_code_references(obj_name, obj_type, git_files):
    # Determine string to search in code files
    search_term = obj_name
    if obj_type == "politica" and " ON " in obj_name:
        search_term = obj_name.split(" ON ")[0]

    refs = set()
    for f in git_files:
        # Ignore SQL files for code reference search
        if f.endswith(".sql"):
            continue
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_content:
                content = file_content.read()
                # Exact or word boundary match
                if re.search(r'\b' + re.escape(search_term) + r'\b', content):
                    refs.add(f)
        except Exception:
            pass

    return sorted(list(refs))

def main():
    git_files = get_git_files()
    sql_files = ["supabase/schema.sql"] + sorted([f for f in git_files if f.startswith("supabase/migrations/") and f.endswith(".sql")])

    all_raw_objects = []
    for sf in sql_files:
        all_raw_objects.extend(parse_sql_file(sf))

    # Group objects by (objeto, tipo)
    grouped = {}
    for item in all_raw_objects:
        key = (item["objeto"], item["tipo"])
        if key not in grouped:
            grouped[key] = {
                "objeto": item["objeto"],
                "tipo": item["tipo"],
                "definiciones": [],
                "rls": item["rls"],
                "definition_strs": []
            }
        grouped[key]["definiciones"].append(item["definido_en"])
        grouped[key]["definition_strs"].append(item["definition_str"])
        if item["rls"] == "si":
            grouped[key]["rls"] = "si"

    rows = []
    for (obj_name, obj_type), data in grouped.items():
        n_def = len(data["definiciones"])
        def_locs = "; ".join(data["definiciones"])

        # Find code references
        refs = search_code_references(obj_name, obj_type, git_files)
        n_refs = len(refs)
        refs_str = "; ".join(refs) if refs else "ninguno"

        # Check candidate duplicate
        # candidate duplicate if n_def > 1 or definitions differ
        is_candidate_dup = False
        if n_def > 1:
            is_candidate_dup = True

        out_obj_name = obj_name
        if is_candidate_dup:
            out_obj_name = f"{obj_name} [CANDIDATO DUPLICADO]"

        rows.append({
            "objeto": out_obj_name,
            "tipo": obj_type,
            "definido_en": def_locs,
            "n_definiciones": n_def,
            "rls_habilitado_en_texto": data["rls"],
            "referenciado_en_codigo": refs_str,
            "n_referencias": n_refs
        })

    output_csv = "docs/inventario/04_base_de_datos.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "objeto",
            "tipo",
            "definido_en",
            "n_definiciones",
            "rls_habilitado_en_texto",
            "referenciado_en_codigo",
            "n_referencias"
        ])

        for r in rows:
            writer.writerow([
                r["objeto"],
                r["tipo"],
                r["definido_en"],
                r["n_definiciones"],
                r["rls_habilitado_en_texto"],
                r["referenciado_en_codigo"],
                r["n_referencias"]
            ])

    print(f"Generated {output_csv} with {len(rows)} rows.")

if __name__ == "__main__":
    main()
