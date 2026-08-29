"""
Tests con HTTP mockeado para auditar_consistencia_tripartita (extract_and_audit.py).
No hacen llamadas reales a la red ni tocan los HTML reales del repo:
BASE_DIR se redirige a un directorio temporal con plantillas mínimas.

Recordatorios Diarios (index.html) es fatal ante cualquier fallo (SRS-FR-M1-105).
Recordatorios Varios (recordatorios-varios.html) es aislado y no fatal
(SRS-FR-M4-401): un problema con esa base nunca debe interrumpir ni revertir
la sincronización de Recordatorios Diarios, que corre primero.
"""
from unittest.mock import Mock, patch

import pytest
import requests

import extract_and_audit


PLANTILLA_INDEX = """<html><body>
<script>
    const timestampLocalStr = "";
    const appVersionStr = "";
    const timestampNextStr = "";
    const timestampServerStr = "";

    const conteoAyer = {};
    const conteoHoy = {};
    const conteoManana = {};
</script>
</body></html>"""

PLANTILLA_VARIOS = """<html><body>
<script>
    const timestampLocalStr = "";
    const appVersionStr = "";
    const timestampNextStr = "";
    const timestampServerStr = "";

    const recordatoriosVarios = [];
</script>
</body></html>"""


def _preparar_directorio_temporal(tmp_path, monkeypatch, con_pagina_varios=True):
    (tmp_path / "index.html").write_text(PLANTILLA_INDEX, encoding="utf-8")
    if con_pagina_varios:
        (tmp_path / "recordatorios-varios.html").write_text(PLANTILLA_VARIOS, encoding="utf-8")
    monkeypatch.setattr(extract_and_audit, "BASE_DIR", tmp_path)
    monkeypatch.setattr(extract_and_audit, "validar_credenciales", lambda: None)
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "A" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_DIARIOS", "B" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_VARIOS", "C" * 40)


def _mock_respuesta_notion(resultados):
    respuesta = Mock()
    respuesta.raise_for_status = Mock()
    respuesta.json.return_value = {"results": resultados}
    return respuesta


def _pagina_diarios():
    return {
        "properties": {
            "Estado": {"type": "status", "status": {"name": "Hecha"}},
            "Fecha": {"type": "date", "date": {"start": "2026-01-01"}},
        },
        "created_time": "2026-01-01T00:00:00.000Z",
    }


def _pagina_varios():
    return {
        "properties": {
            "Nombre": {"title": [{"plain_text": "Lavar gorras"}]},
            "Estado": {"status": {"name": "Sin empezar"}},
            "Prioridad": {"select": {"name": "MEDIA"}},
            "Área": {"select": {"name": "Higiene"}},
            "Periodo": {"select": {"name": "MENSUAL"}},
            "Fecha": {"date": {"start": "2026-08-24"}},
        }
    }


def _fake_post_por_db(db_varios_id, respuesta_o_excepcion_varios, respuesta_diarios=None):
    """side_effect de requests.post que responde distinto según el DB id en la URL:
    Recordatorios Diarios siempre exitoso (con _pagina_diarios por defecto),
    Recordatorios Varios responde/lanza lo indicado."""
    def _fake_post(url, *args, **kwargs):
        if db_varios_id in url:
            if isinstance(respuesta_o_excepcion_varios, Exception):
                raise respuesta_o_excepcion_varios
            return respuesta_o_excepcion_varios
        return respuesta_diarios or _mock_respuesta_notion([_pagina_diarios()])
    return _fake_post


def test_conexion_exitosa_sincroniza_ambos_frontends(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    fake_post = _fake_post_por_db("C" * 40, _mock_respuesta_notion([_pagina_varios()]))

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_diarios = (tmp_path / "index.html").read_text(encoding="utf-8")
    assert 'const timestampLocalStr = "";' not in salida_diarios
    assert 'const appVersionStr = "dev";' in salida_diarios

    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")
    assert 'const timestampLocalStr = "";' not in salida_varios
    assert "Lavar gorras" in salida_varios
    assert '"estado": "Sin empezar"' in salida_varios or '"estado":"Sin empezar"' in salida_varios


def test_recordatorios_varios_no_configurada_no_rompe_diarios(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_VARIOS", None)

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([_pagina_diarios()])):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")
    assert "const recordatoriosVarios = [];" in salida_varios


def test_recordatorios_varios_401_no_aborta_diarios(tmp_path, monkeypatch, capsys):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_401 = Mock()
    respuesta_401.status_code = 401
    error_401 = requests.exceptions.HTTPError(response=respuesta_401)

    fake_post = _fake_post_por_db("C" * 40, error_401)

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        # No debe lanzar SystemExit: el fallo de Recordatorios Varios es aislado.
        extract_and_audit.auditar_consistencia_tripartita()

    salida = capsys.readouterr().out
    assert "✅ Frontend index.html sincronizado" in salida
    assert "RECORDATORIOS VARIOS" in salida

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")
    assert "const recordatoriosVarios = [];" in salida_varios


def test_recordatorios_varios_500_no_aborta_diarios(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_500 = Mock()
    respuesta_500.status_code = 500
    error_500 = requests.exceptions.HTTPError(response=respuesta_500)

    fake_post = _fake_post_por_db("C" * 40, error_500)

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")


def test_recordatorios_varios_sin_archivo_no_rompe_diarios(tmp_path, monkeypatch):
    """Si recordatorios-varios.html no existe todavía en este entorno, se omite
    sin afectar la sincronización de Recordatorios Diarios."""
    _preparar_directorio_temporal(tmp_path, monkeypatch, con_pagina_varios=False)

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([_pagina_diarios()])):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    assert not (tmp_path / "recordatorios-varios.html").exists()


def test_falla_401_en_diarios_hace_exit_1_y_no_toca_ningun_archivo(tmp_path, monkeypatch, capsys):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_401 = Mock()
    respuesta_401.status_code = 401
    error_401 = requests.exceptions.HTTPError(response=respuesta_401)

    with patch.object(extract_and_audit.requests, "post", side_effect=error_401):
        with pytest.raises(SystemExit) as exc_info:
            extract_and_audit.auditar_consistencia_tripartita()

    assert exc_info.value.code == 1
    assert "401" in capsys.readouterr().out

    # El fallo ocurre en raise_for_status() de Recordatorios Diarios, antes de
    # escribir ningún archivo — Recordatorios Varios ni siquiera llega a consultarse.
    assert (tmp_path / "index.html").read_text(encoding="utf-8") == PLANTILLA_INDEX
    assert (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8") == PLANTILLA_VARIOS


def test_falla_500_en_diarios_tambien_hace_exit_1(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_500 = Mock()
    respuesta_500.status_code = 500
    error_500 = requests.exceptions.HTTPError(response=respuesta_500)

    with patch.object(extract_and_audit.requests, "post", side_effect=error_500):
        with pytest.raises(SystemExit) as exc_info:
            extract_and_audit.auditar_consistencia_tripartita()

    assert exc_info.value.code == 1
    assert (tmp_path / "index.html").read_text(encoding="utf-8") == PLANTILLA_INDEX
