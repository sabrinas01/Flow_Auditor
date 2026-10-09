"""
Test de regresión — publicación completa de frontends en gh-pages
(SRS-FR-M2-206, HU Notion #10, cierra el gap conocido desde v4.8).

Sin llamadas de red ni a git real: parsea estáticamente el YAML del workflow
y el código fuente de extract_and_audit.py.
"""
import re

import yaml

import extract_and_audit


def _frontends_que_escribe_el_script():
    """Escanea extract_and_audit.py buscando cada `BASE_DIR / "*.html"` — el
    patrón que usan las tres funciones de sincronización (Diarios/Varios/
    Agenda) para resolver la ruta del frontend que escriben."""
    codigo_fuente = (extract_and_audit.BASE_DIR / "extract_and_audit.py").read_text(encoding="utf-8")
    return set(re.findall(r'BASE_DIR\s*/\s*"([\w.-]+\.html)"', codigo_fuente))


def _frontends_en_git_add_del_publish():
    """Parsea notion_sync.yml y devuelve el set de archivos .html del `git add`
    dentro del step "Publish updated frontends to the gh-pages branch"."""
    workflow_path = extract_and_audit.BASE_DIR / ".github" / "workflows" / "notion_sync.yml"
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = yaml.safe_load(f)

    steps = workflow["jobs"]["build"]["steps"]
    step_publish = next(s for s in steps if "Publish" in s["name"])
    match = re.search(r"git add ([^\n]+)", step_publish["run"])
    assert match, "El step de Publish no tiene una línea `git add`"
    return {archivo for archivo in match.group(1).split() if archivo.endswith(".html")}


def test_publish_hace_git_add_de_todos_los_frontends_que_escribe_el_script():
    """Si extract_and_audit.py escribe un frontend nuevo, el `git add` del step
    Publish debe incluirlo — si no, ese archivo queda actualizado en el runner
    pero nunca llega a gh-pages (el bug real de v4.8, con recordatorios-varios.html
    congelado en placeholder pese a que el script sí lo sincronizaba)."""
    escritos_por_script = _frontends_que_escribe_el_script()
    en_git_add = _frontends_en_git_add_del_publish()

    faltantes = escritos_por_script - en_git_add
    assert not faltantes, (
        f"extract_and_audit.py escribe {faltantes} pero el `git add` del step "
        "Publish de notion_sync.yml no los incluye - quedarían congelados en "
        "gh-pages con datos viejos (ver SRS-FR-M2-206)."
    )
