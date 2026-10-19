# 00_MANIFIESTO.md

## Información General
- **Fecha:** 2025-10-19
- **Commit:** `d2e6ab329200f1a9409c308f16baf972fad02729`
- **Rama:** `jules-11392462768945292651-c89edc9f`

## Cifras Base del Repositorio
- **Archivos rastreados por Git (`git ls-files | wc -l`):** 223

### Líneas totales y conteo de archivos por extensión:
| Extensión | N° Archivos | Líneas Totales |
| --- | --- | --- |
| `.tsx` | 81 | 10676 |
| `.ts` | 69 | 10256 |
| `.yaml` | 1 | 9447 |
| `.png` | 2 | 6007 |
| `.md` | 19 | 2364 |
| `.py` | 10 | 1934 |
| `.csv` | 6 | 902 |
| `.js` | 1 | 821 |
| `.sql` | 10 | 551 |
| `.json` | 9 | 399 |
| `.gitignore` | 1 | 114 |
| `.yml` | 2 | 88 |
| `.css` | 1 | 81 |
| `.example` | 3 | 53 |
| `.mmd` | 1 | 45 |
| `.prettierignore` | 1 | 35 |
| `.patch` | 1 | 28 |
| `.prettierrc` | 1 | 15 |
| `.html` | 1 | 14 |
| `.gitkeep` | 1 | 0 |
| `(sin extensión)` | 2 | 0 |

## Registro de Comandos Ejecutados
| Paso / Comando Ejecutado | Conteo de Salida | Script Asociado |
| --- | --- | --- |
| `git ls-files` | 223 archivos | N/A |
| `python3 docs/inventario/scripts/generate_01_archivos.py` | 203 filas generadas | `generate_01_archivos.py` |
| `python3 docs/inventario/scripts/generate_02_rutas_backend.py` | 42 filas generadas | `generate_02_rutas_backend.py` |
| `python3 docs/inventario/scripts/generate_03_rutas_frontend.py` | 19 filas generadas | `generate_03_rutas_frontend.py` |
| `python3 docs/inventario/scripts/generate_04_base_de_datos.py` | 60 filas generadas | `generate_04_base_de_datos.py` |
| `python3 docs/inventario/scripts/generate_05_variables_entorno.py` | 40 filas generadas | `generate_05_variables_entorno.py` |
| `python3 docs/inventario/scripts/generate_06_duplicados.py` | Documento MD generado | `generate_06_duplicados.py` |
| `python3 docs/inventario/scripts/generate_07_huerfanos.py` | Documento MD generado | `generate_07_huerfanos.py` |
| `python3 docs/inventario/scripts/generate_08_arquitectura.py` | Documento MD generado | `generate_08_arquitectura.py` |
| `python3 docs/inventario/scripts/generate_09_mapa_capacidades.py` | 152 filas generadas | `generate_09_mapa_capacidades.py` |

## Entregables Generados (01 a 09)
| Entregable | Script Creador | Filas Generadas |
| --- | --- | --- |
| `01_archivos.csv` | `generate_01_archivos.py` | 203 filas de datos |
| `02_rutas_backend.csv` | `generate_02_rutas_backend.py` | 42 filas de datos |
| `03_rutas_frontend.csv` | `generate_03_rutas_frontend.py` | 19 filas de datos |
| `04_base_de_datos.csv` | `generate_04_base_de_datos.py` | 60 filas de datos |
| `05_variables_entorno.csv` | `generate_05_variables_entorno.py` | 40 filas de datos |
| `06_duplicados.md` | `generate_06_duplicados.py` | Documento Markdown (430 líneas) |
| `07_huerfanos.md` | `generate_07_huerfanos.py` | Documento Markdown (286 líneas) |
| `08_arquitectura.md` | `generate_08_arquitectura.py` | Documento Markdown (249 líneas) |
| `09_mapa_capacidades.csv` | `generate_09_mapa_capacidades.py` | 520 filas de datos |

## Pasos NO EJECUTADO
Ninguno. Todos los pasos del inventario mecánico fueron ejecutados exitosamente sin omitir procedimientos.

## AUTOVERIFICACIÓN
| entregable | filas esperadas | filas generadas | coincide (si/no) |
| --- | --- | --- | --- |
| 01_archivos.csv | 203 | 203 | si |
| 02_rutas_backend.csv | 42 | 42 | si |
| 03_rutas_frontend.csv | 19 | 19 | si |
| 04_base_de_datos.csv | 60 | 60 | si |
| 05_variables_entorno.csv | 40 | 40 | si |
| 06_duplicados.md | Documento MD | 430 líneas | si |
| 07_huerfanos.md | Documento MD | 286 líneas | si |
| 08_arquitectura.md | Documento MD | 249 líneas | si |
| 09_mapa_capacidades.csv | 520 | 520 | si |