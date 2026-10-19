#!/usr/bin/env python3
import csv
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def parse_env_example():
    filepath = ".env.example"
    env_vars = {}
    if not os.path.exists(filepath):
        return env_vars

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split("=", 1)
                var_name = parts[0].strip()
                default_val = parts[1].strip() if len(parts) > 1 else ""
                env_vars[var_name] = default_val
    return env_vars

def find_env_vars_in_code_and_docs(git_files):
    env_vars_map = {} # var_name -> {'code_locations': [], 'doc_locations': [], 'defaults': set()}

    # Regex patterns to detect env var usage
    # process.env.VAR_NAME, import.meta.env.VAR_NAME, env.VAR_NAME, getEnv('VAR_NAME')
    re_env = re.compile(r'\b(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)\b')
    re_zod_env = re.compile(r'([A-Z0-9_]+):\s*z\.')

    # Defaults pattern e.g. process.env.PORT || "3000" or .default("3000")
    re_default = re.compile(r'(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)\s*\|\|\s*["\']?([^"\'\s;,)]+)["\']?')

    for f in git_files:
        is_doc = f.startswith("docs/") or f.endswith(".md")
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_content:
                lines = file_content.readlines()
                for idx, line in enumerate(lines, 1):
                    # Check env var mentions
                    matches = re_env.findall(line)
                    for var_name in matches:
                        if var_name not in env_vars_map:
                            env_vars_map[var_name] = {"code_locations": [], "doc_locations": [], "defaults": set()}
                        loc = f"{f}:{idx}"
                        if is_doc:
                            env_vars_map[var_name]["doc_locations"].append(loc)
                        else:
                            env_vars_map[var_name]["code_locations"].append(loc)

                    # Check defaults in process.env
                    def_matches = re_default.findall(line)
                    for var_name, def_val in def_matches:
                        if var_name in env_vars_map:
                            env_vars_map[var_name]["defaults"].add(def_val)

                    # Check docs for inline variable mentions like `PORT` or `SUPABASE_URL`
                    if is_doc:
                        # Find uppercase word matching known env patterns
                        doc_vars = re.findall(r'\b([A-Z0-9_]{3,})\b', line)
                        for dv in doc_vars:
                            if any(k in dv for k in ["PORT", "NODE_ENV", "SUPABASE", "COPERNICUS", "TWILIO", "COOKIE", "FORGE", "OAUTH", "APP_ID", "DEMO", "WORKER"]):
                                if dv not in env_vars_map:
                                    env_vars_map[dv] = {"code_locations": [], "doc_locations": [], "defaults": set()}
                                env_vars_map[dv]["doc_locations"].append(f"{f}:{idx}")
        except Exception:
            pass

    return env_vars_map

def main():
    git_files = get_git_files()
    env_example = parse_env_example()
    code_doc_vars = find_env_vars_in_code_and_docs(git_files)

    # Combine all discovered variable names
    all_var_names = sorted(list(set(list(env_example.keys()) + list(code_doc_vars.keys()))))

    rows = []
    for var in all_var_names:
        in_example = "si" if var in env_example else "no"

        info = code_doc_vars.get(var, {"code_locations": [], "doc_locations": [], "defaults": set()})

        doc_locs = info["doc_locations"]
        in_docs = "; ".join(doc_locs) if doc_locs else "no"

        code_locs = info["code_locations"]
        read_in_code = "; ".join(code_locs) if code_locs else "no"

        # Defaults determination
        example_def = env_example.get(var, "")
        code_defs = list(info["defaults"])
        all_defs = [d for d in [example_def] + code_defs if d]
        default_val = "; ".join(set(all_defs)) if all_defs else "ninguno"

        # Used in: server|client|worker|build
        used_in = set()
        for loc in code_locs:
            if loc.startswith("server/services/analysis-worker.ts") or loc.startswith("server/worker.ts"):
                used_in.add("worker")
            elif loc.startswith("server/"):
                used_in.add("server")
            elif loc.startswith("client/"):
                used_in.add("client")
            elif loc.startswith("shared/"):
                used_in.add("server")
                used_in.add("client")
            elif "vite.config.ts" in loc or "vitest.config.ts" in loc or "package.json" in loc:
                used_in.add("build")

        if not used_in:
            if var.startswith("VITE_"):
                used_in.add("client")
            elif var in ["PORT", "NODE_ENV", "COOKIE_SECRET", "OAUTH_SERVER_URL"]:
                used_in.add("server")
            else:
                used_in.add("server")

        used_in_str = "|".join(sorted(list(used_in)))

        rows.append({
            "nombre": var,
            "en_env_example": in_example,
            "en_docs": in_docs,
            "leida_en_codigo": read_in_code,
            "con_valor_por_defecto": default_val,
            "usada_en": used_in_str
        })

    output_csv = "docs/inventario/05_variables_entorno.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "nombre",
            "en_env_example",
            "en_docs",
            "leida_en_codigo",
            "con_valor_por_defecto",
            "usada_en"
        ])

        for r in rows:
            writer.writerow([
                r["nombre"],
                r["en_env_example"],
                r["en_docs"],
                r["leida_en_codigo"],
                r["con_valor_por_defecto"],
                r["usada_en"]
            ])

    print(f"Generated {output_csv} with {len(rows)} rows.")

if __name__ == "__main__":
    main()
