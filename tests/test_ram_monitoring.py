"""
Tests de verificar_consumo_ram (extract_and_audit.py) — SRS Escenario 4
(Validación de Consumo de Recursos). psutil.Process se mockea: no miden
RAM real de la máquina que corre el test, solo la lógica de umbral/alerta.
"""
from unittest.mock import Mock, patch

import pytest

import extract_and_audit


def _mock_proceso_con_rss_mb(rss_mb):
    proceso = Mock()
    proceso.memory_info.return_value = Mock(rss=int(rss_mb * 1024 * 1024))
    return proceso


def test_por_debajo_del_umbral_no_imprime_alerta(capsys):
    with patch.object(extract_and_audit.psutil, "Process", return_value=_mock_proceso_con_rss_mb(30)):
        rss = extract_and_audit.verificar_consumo_ram(umbral_mb=50)

    assert rss == 30
    assert "ALERTA" not in capsys.readouterr().out


def test_por_encima_del_umbral_imprime_alerta_con_el_formato_del_srs(capsys):
    with patch.object(extract_and_audit.psutil, "Process", return_value=_mock_proceso_con_rss_mb(73.4)):
        rss = extract_and_audit.verificar_consumo_ram(umbral_mb=50)

    assert rss == pytest.approx(73.4, abs=0.01)
    salida = capsys.readouterr().out
    assert "[ALERTA] Consumo RAM > 50MB (actual: 73.4 MB)" in salida


def test_no_detiene_la_ejecucion_al_exceder_el_umbral():
    # No debe lanzar ni hacer sys.exit -- solo alertar (requisito explícito del SRS)
    with patch.object(extract_and_audit.psutil, "Process", return_value=_mock_proceso_con_rss_mb(999)):
        extract_and_audit.verificar_consumo_ram(umbral_mb=50)  # no debe levantar excepción


def test_umbral_exacto_no_dispara_alerta(capsys):
    with patch.object(extract_and_audit.psutil, "Process", return_value=_mock_proceso_con_rss_mb(50)):
        extract_and_audit.verificar_consumo_ram(umbral_mb=50)

    assert "ALERTA" not in capsys.readouterr().out
