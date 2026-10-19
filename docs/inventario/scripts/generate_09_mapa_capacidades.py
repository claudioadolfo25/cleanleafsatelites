#!/usr/bin/env python3
import csv
import os
import re
import subprocess

def get_git_files():
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]

def extract_capability_mentions(git_files):
    # Search docs, README.md, header comments for capability patterns
    doc_and_header_files = [f for f in git_files if f.endswith(".md") or f.startswith("docs/")]

    mentions = []

    # Regex patterns for capability extraction
    patterns = [
        (r'\b(dashboard\s+admin|panel\s+administrativo|gestión\s+de\s+tenants)\b', "Dashboard Admin y Gestión Multi-Tenant"),
        (r'\b(api\s+keys?|gestión\s+de\s+llaves\s+api)\b', "Gestión de API Keys"),
        (r'\b(reportes?\s+pdf|descarga\s+de\s+informes?|generación\s+pdf)\b', "Reportes PDF"),
        (r'\b(alertas?|motor\s+de\s+alertas?)\b', "Sistema de Alertas"),
        (r'\b(exportación|geojson|descargar\s+geojson)\b', "Exportación GeoJSON"),
        (r'\b(autenticación|auth|login|logout|supa_auth)\b', "Autenticación y Sesiones"),
        (r'\b(predios|gestión\s+de\s+predios|parcelas)\b', "Gestión de Predios y Parcelas"),
        (r'\b(solicitudes\s+de\s+análisis|crear\s+análisis)\b', "Solicitudes de Análisis Satelital"),
        (r'\b(series\s+temporales|time\s+series|mediciones)\b', "Análisis de Series Temporales"),
        (r'\b(chat\s+ia|asistente\s+agronómico|dify)\b', "Asistente Virtual / Chat IA"),
        (r'\b(catálogo\s+satelital|satélites|sentinel|copernicus)\b', "Catálogo y Selección Satelital"),
        (r'\b(aislamiento\s+tenant|rls|multitenancy)\b', "Aislamiento Multi-tenant RLS"),
        (r'\b(worker\s+asíncrono|procesamiento\s+en\s+segundo\s+plano)\b', "Worker Asíncrono de Procesamiento"),
        (r'\b(pago\s+suscripción|planes|stripe)\b', "Gestión de Planes y Suscripciones"),
    ]

    code_files = [f for f in git_files if f.startswith(("client/", "server/", "shared/"))]

    for doc_file in doc_and_header_files:
        try:
            with open(doc_file, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                for idx, line in enumerate(lines, 1):
                    for regex, cap_name in patterns:
                        if re.search(regex, line, re.IGNORECASE):
                            mentions.append({
                                "capacidad": cap_name,
                                "documento:linea": f"{doc_file}:{idx}",
                                "line_text": line.strip()
                            })
        except Exception:
            pass

    return mentions, code_files

def map_related_code_files(cap_name, code_files):
    keywords_map = {
        "Dashboard Admin y Gestión Multi-Tenant": ["admin", "tenant", "superadmin"],
        "Gestión de API Keys": ["api_key", "apikey", "apiKeys"],
        "Reportes PDF": ["pdf", "report", "informe", "pdf-service"],
        "Sistema de Alertas": ["alerta", "alert"],
        "Exportación GeoJSON": ["geojson", "getGeoJson"],
        "Autenticación y Sesiones": ["auth", "login", "logout", "session"],
        "Gestión de Predios y Parcelas": ["predio", "predios"],
        "Solicitudes de Análisis Satelital": ["solicitud", "analysis", "createAnalysis"],
        "Análisis de Series Temporales": ["time-series", "timeseries", "mediciones"],
        "Asistente Virtual / Chat IA": ["chat", "ai", "llm"],
        "Catálogo y Selección Satelital": ["copernicus", "catalog", "satelital", "satellite"],
        "Aislamiento Multi-tenant RLS": ["tenant", "context", "trpc"],
        "Worker Asíncrono de Procesamiento": ["worker", "analysis-worker"],
        "Gestión de Planes y Suscripciones": ["plan", "plan-limits", "suscripciones"]
    }

    keywords = keywords_map.get(cap_name, [])
    related = set()

    for f in code_files:
        fname = os.path.basename(f).lower()
        if any(kw in fname for kw in keywords):
            related.add(f)
            continue
        # Content match check
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as file_obj:
                content = file_obj.read()
                if any(re.search(r'\b' + re.escape(kw) + r'\b', content, re.IGNORECASE) for kw in keywords):
                    related.add(f)
        except Exception:
            pass

    return sorted(list(related))

def main():
    git_files = get_git_files()
    mentions, code_files = extract_capability_mentions(git_files)

    rows = []
    for m in mentions:
        cap = m["capacidad"]
        doc_loc = m["documento:linea"]
        rel_code = map_related_code_files(cap, code_files)
        n_rel = len(rel_code)
        rel_code_str = "; ".join(rel_code) if rel_code else "0"

        rows.append({
            "capacidad": cap,
            "documento:linea_donde_se_menciona": doc_loc,
            "archivos_de_codigo_relacionados": rel_code_str,
            "n_archivos_relacionados": n_rel
        })

    output_csv = "docs/inventario/09_mapa_capacidades.csv"
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    with open(output_csv, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "capacidad",
            "documento:linea_donde_se_menciona",
            "archivos_de_codigo_relacionados",
            "n_archivos_relacionados"
        ])

        for r in rows:
            writer.writerow([
                r["capacidad"],
                r["documento:linea_donde_se_menciona"],
                r["archivos_de_codigo_relacionados"],
                r["n_archivos_relacionados"]
            ])

    print(f"Generated {output_csv} with {len(rows)} rows.")

if __name__ == "__main__":
    main()
