"""
Tests de cron, inyección de versión y cálculo de próxima sincronización
(extract_and_audit.py) — cierra el gap de la HU "Despliegue Automatizado y
Trazabilidad de Versiones" (SRS-FR-M2-202, SRS-FR-M2-204).
No hacen llamadas de red ni a un git real (subprocess mockeado).
"""
from datetime import datetime, timezone
from unittest.mock import patch
import subprocess

import yaml

import extract_and_audit


# ---------------------------------------------------------------------------
# Cron: SRS-FR-M2-202 (ciclo invariable de 1 hora)
# ---------------------------------------------------------------------------

def test_notion_sync_workflow_tiene_cron_horario():
    workflow_path = extract_and_audit.BASE_DIR / ".github" / "workflows" / "notion_sync.yml"
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = yaml.safe_load(f)

    # La clave "on" es una palabra reservada de YAML 1.1 y PyYAML la parsea como True
    disparadores = workflow.get("on", workflow.get(True))
    assert disparadores["schedule"][0]["cron"] == "0 * * * *"


# ---------------------------------------------------------------------------
# Inyección de versión: SRS-FR-M2-204
# ---------------------------------------------------------------------------

def test_obtener_version_actual_devuelve_el_tag_de_git():
    with patch.object(
        extract_and_audit.subprocess, "check_output", return_value=b"v4.2\n"
    ) as mock_check_output:
        assert extract_and_audit.obtener_version_actual() == "v4.2"
        mock_check_output.assert_called_once_with(
            ["git", "describe", "--tags", "--abbrev=0"],
            cwd=extract_and_audit.BASE_DIR,
            stderr=subprocess.DEVNULL,
        )


def test_obtener_version_actual_sin_tags_cae_a_dev():
    error = subprocess.CalledProcessError(returncode=128, cmd=["git", "describe"])
    with patch.object(extract_and_audit.subprocess, "check_output", side_effect=error):
        assert extract_and_audit.obtener_version_actual() == "dev"


# ---------------------------------------------------------------------------
# Cálculo de próxima sincronización: SRS-FR-M2-202 / SRS-FR-M3-304
# ---------------------------------------------------------------------------

def test_calcular_timestamps_resta_3_horas_y_suma_1_hora():
    # 2026-01-15 14:00:00 UTC -> local GMT-3: 2026-01-15 11:00:00 -> próxima: 12:00:00
    ahora_utc = datetime(2026, 1, 15, 14, 0, 0, tzinfo=timezone.utc)
    ts = extract_and_audit.calcular_timestamps_sincronizacion(ahora_utc)

    assert ts["local"] == "15/01/2026 11:00:00"
    assert ts["proxima"] == "15/01/2026 12:00:00"
    assert ts["servidor"] == "15/01/2026 14:00:00"


def test_calcular_timestamps_borde_de_medianoche_gmt3():
    # 2026-01-15 01:30:00 UTC -> local GMT-3 retrocede al día anterior: 14/01 22:30:00
    ahora_utc = datetime(2026, 1, 15, 1, 30, 0, tzinfo=timezone.utc)
    ts = extract_and_audit.calcular_timestamps_sincronizacion(ahora_utc)

    assert ts["local"] == "14/01/2026 22:30:00"
    assert ts["proxima"] == "14/01/2026 23:30:00"


def test_calcular_timestamps_proxima_sincro_puede_cruzar_al_dia_siguiente():
    # Local 23:30 -> +1h próxima sincro cruza a la medianoche del día siguiente
    ahora_utc = datetime(2026, 1, 16, 2, 30, 0, tzinfo=timezone.utc)  # local: 15/01 23:30
    ts = extract_and_audit.calcular_timestamps_sincronizacion(ahora_utc)

    assert ts["local"] == "15/01/2026 23:30:00"
    assert ts["proxima"] == "16/01/2026 00:30:00"
