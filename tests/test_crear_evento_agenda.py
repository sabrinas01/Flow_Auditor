"""
Tests con HTTP mockeado para crear_evento_agenda() (extract_and_audit.py) —
el botón "Crear tarea" de agenda-personal.html, invocado vía
repository_dispatch (ver .github/workflows/crear_evento_agenda.yml,
SRS-FR-M5-507). No hacen llamadas reales a la red.

A diferencia del resto de las sincronizaciones del módulo (aisladas y no
fatales), un fallo acá SÍ debe ser fatal (sys.exit(1)): es la única razón de
ser del workflow que la invoca.
"""
from unittest.mock import Mock, patch

import pytest
import requests

import extract_and_audit


def _preparar_credenciales(monkeypatch, db_eventos="D" * 40):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "A" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_AGENDA_EVENTOS", db_eventos)


def _mock_respuesta_creada(pagina_id="pagina-123"):
    respuesta = Mock()
    respuesta.raise_for_status = Mock()
    respuesta.json.return_value = {"id": pagina_id}
    return respuesta


def test_sin_db_configurada_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch, db_eventos=None)
    with pytest.raises(SystemExit):
        extract_and_audit.crear_evento_agenda({"nombre": "Turno", "fecha_inicio": "2026-11-14"})


@pytest.mark.parametrize("datos", [
    {"fecha_inicio": "2026-11-14"},  # sin nombre
    {"nombre": "Turno"},  # sin fecha_inicio
    {"nombre": "  ", "fecha_inicio": "2026-11-14"},  # nombre vacío tras strip
])
def test_payload_incompleto_sale_fatal(monkeypatch, datos):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.crear_evento_agenda(datos)


def test_crea_evento_minimo_con_default_de_estado(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_post = Mock(return_value=_mock_respuesta_creada())
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_evento_agenda({"nombre": "Turno con dermatólogo", "fecha_inicio": "2026-11-14"})

    url, kwargs = mock_post.call_args[0][0], mock_post.call_args[1]
    assert url == "https://api.notion.com/v1/pages"
    body = kwargs["json"]
    assert body["parent"] == {"database_id": "D" * 40}
    assert body["properties"]["Nombre"] == {"title": [{"text": {"content": "Turno con dermatólogo"}}]}
    assert body["properties"]["Estado"] == {"status": {"name": "Sin empezar"}}
    assert body["properties"]["Fecha"] == {"date": {"start": "2026-11-14"}}
    assert "Tipo de tarea" not in body["properties"]
    assert "Prioridad" not in body["properties"]
    assert "Descripción" not in body["properties"]
    assert "Lugar" not in body["properties"]


def test_crea_evento_completo_con_todos_los_campos_opcionales(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_post = Mock(return_value=_mock_respuesta_creada())
    datos = {
        "nombre": "Turno con dermatólogo",
        "fecha_inicio": "2026-11-14T15:30:00-03:00",
        "fecha_fin": "2026-11-14T16:30:00-03:00",
        "estado": "Planificada",
        "tipo_tarea": "ESTUDIO MÉDICO",
        "prioridad": "Alta",
        "descripcion": "Llevar estudios previos",
    }
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_evento_agenda(datos)

    body = mock_post.call_args[1]["json"]
    assert body["properties"]["Fecha"] == {
        "date": {"start": "2026-11-14T15:30:00-03:00", "end": "2026-11-14T16:30:00-03:00"}
    }
    assert body["properties"]["Estado"] == {"status": {"name": "Planificada"}}
    assert body["properties"]["Tipo de tarea"] == {"select": {"name": "ESTUDIO MÉDICO"}}
    assert body["properties"]["Prioridad"] == {"select": {"name": "Alta"}}
    assert body["properties"]["Descripción"] == {"rich_text": [{"text": {"content": "Llevar estudios previos"}}]}


def test_fallo_http_de_notion_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    respuesta = Mock()
    respuesta.status_code = 400
    respuesta.text = '{"message": "property not found"}'
    respuesta.raise_for_status = Mock(side_effect=requests.exceptions.HTTPError(response=respuesta))

    with patch.object(extract_and_audit.requests, "post", Mock(return_value=respuesta)):
        with pytest.raises(SystemExit):
            extract_and_audit.crear_evento_agenda({"nombre": "Turno", "fecha_inicio": "2026-11-14"})
