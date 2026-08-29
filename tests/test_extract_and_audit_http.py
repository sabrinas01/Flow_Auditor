"""
Tests con HTTP mockeado para auditar_consistencia_tripartita (extract_and_audit.py).
No hacen llamadas reales a la red ni tocan el index.html real del repo:
BASE_DIR se redirige a un directorio temporal con una plantilla mínima.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import pytest
import requests

import extract_and_audit


PLANTILLA_MINIMA = """<html><body>
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


def _preparar_directorio_temporal(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text(PLANTILLA_MINIMA, encoding="utf-8")
    (tmp_path / "recordatorios-varios.html").write_text(PLANTILLA_MINIMA, encoding="utf-8")
    monkeypatch.setattr(extract_and_audit, "BASE_DIR", tmp_path)
    monkeypatch.setattr(extract_and_audit, "validar_credenciales", lambda: None)


def _mock_respuesta_notion(resultados):
    respuesta = Mock()
    respuesta.raise_for_status = Mock()
    respuesta.json.return_value = {"results": resultados}
    return respuesta


def test_conexion_exitosa_escribe_la_plantilla(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    pagina_falsa = {
        "properties": {
            "Estado": {"type": "status", "status": {"name": "Hecha"}},
            "Fecha": {"type": "date", "date": {"start": "2026-01-01"}},
        },
        "created_time": "2026-01-01T00:00:00.000Z",
    }

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([pagina_falsa])):
        extract_and_audit.auditar_consistencia_tripartita()

    # Ambos frontends (index.html y recordatorios-varios.html) deben sincronizarse igual
    for nombre_archivo in ("index.html", "recordatorios-varios.html"):
        salida = (tmp_path / nombre_archivo).read_text(encoding="utf-8")

        # Los placeholders vacíos deben haber sido reemplazados con datos reales
        assert 'const timestampLocalStr = "";' not in salida
        assert 'const timestampServerStr = "";' not in salida
        # Sin tags de git en el directorio temporal -> fallback documentado a "dev"
        assert 'const appVersionStr = "dev";' in salida


def test_diarios_y_varios_son_bases_independientes(tmp_path, monkeypatch):
    """Recordatorios Diarios y Recordatorios Varios deben consultar bases de
    Notion distintas y cada frontend debe quedar con los datos de SU propia
    base — no la misma data duplicada en los dos archivos."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_DIARIOS", "db-diarios-id")
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_VARIOS", "db-varios-id")

    ayer_str = ((datetime.now(timezone.utc) - timedelta(hours=3)) - timedelta(days=1)).strftime("%Y-%m-%d")

    pagina_diarios = {
        "properties": {
            "Estado": {"type": "status", "status": {"name": "Hecha"}},
            "Fecha": {"type": "date", "date": {"start": ayer_str}},
        },
        "created_time": f"{ayer_str}T00:00:00.000Z",
    }
    pagina_varios = {
        "properties": {
            "Estado": {"type": "status", "status": {"name": "Sin empezar"}},
            "Fecha": {"type": "date", "date": {"start": ayer_str}},
        },
        "created_time": f"{ayer_str}T00:00:00.000Z",
    }

    mock_post = Mock(side_effect=[
        _mock_respuesta_notion([pagina_diarios]),
        _mock_respuesta_notion([pagina_varios, pagina_varios]),
    ])

    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.auditar_consistencia_tripartita()

    # Se consultó cada base por su propio ID, en el orden Diarios -> Varios
    urls_llamadas = [llamada.args[0] for llamada in mock_post.call_args_list]
    assert urls_llamadas == [
        "https://api.notion.com/v1/databases/db-diarios-id/query",
        "https://api.notion.com/v1/databases/db-varios-id/query",
    ]

    salida_diarios = (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")

    assert 'const conteoAyer = {"Hecha": 1};' in salida_diarios
    assert 'const conteoAyer = {"Sin empezar": 2};' in salida_varios
    # Los dos frontends no deben terminar con el mismo conteo
    assert salida_diarios != salida_varios


def test_falla_401_hace_exit_1_y_no_toca_el_archivo(tmp_path, monkeypatch, capsys):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_401 = Mock()
    respuesta_401.status_code = 401
    error_401 = requests.exceptions.HTTPError(response=respuesta_401)

    with patch.object(extract_and_audit.requests, "post", side_effect=error_401):
        with pytest.raises(SystemExit) as exc_info:
            extract_and_audit.auditar_consistencia_tripartita()

    assert exc_info.value.code == 1
    assert "401" in capsys.readouterr().out

    # El fallo ocurre en raise_for_status(), antes de leer/escribir el archivo
    assert (tmp_path / "index.html").read_text(encoding="utf-8") == PLANTILLA_MINIMA
    assert (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8") == PLANTILLA_MINIMA


def test_falla_500_tambien_hace_exit_1(tmp_path, monkeypatch, capsys):
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_500 = Mock()
    respuesta_500.status_code = 500
    error_500 = requests.exceptions.HTTPError(response=respuesta_500)

    with patch.object(extract_and_audit.requests, "post", side_effect=error_500):
        with pytest.raises(SystemExit) as exc_info:
            extract_and_audit.auditar_consistencia_tripartita()

    assert exc_info.value.code == 1
    assert (tmp_path / "index.html").read_text(encoding="utf-8") == PLANTILLA_MINIMA
