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


def test_actualizar_evento_agenda_envia_patch_y_limpia_opcionales(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("page-99"))
    datos = {
        "page_id": "page-99",
        "nombre": "Turno actualizado",
        "fecha_inicio": "2026-11-21T10:00:00-03:00",
        "fecha_fin": None,
        "estado": "En curso",
        "tipo_tarea": None,
        "prioridad": None,
        "descripcion": None,
    }
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_evento_agenda(datos)

    url, kwargs = mock_patch.call_args[0][0], mock_patch.call_args[1]
    assert url == "https://api.notion.com/v1/pages/page-99"
    props = kwargs["json"]["properties"]
    assert props["Nombre"] == {"title": [{"text": {"content": "Turno actualizado"}}]}
    assert props["Estado"] == {"status": {"name": "En curso"}}
    assert props["Tipo de tarea"] == {"select": None}
    assert props["Prioridad"] == {"select": None}
    assert props["Descripción"] == {"rich_text": []}


def test_actualizar_evento_sin_page_id_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.actualizar_evento_agenda({"nombre": "Turno", "fecha_inicio": "2026-11-21"})


def test_archivar_pagina_notion_envia_archived_true(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("page-77"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.archivar_pagina_notion({"page_id": "page-77"})

    url, kwargs = mock_patch.call_args[0][0], mock_patch.call_args[1]
    assert url == "https://api.notion.com/v1/pages/page-77"
    assert kwargs["json"] == {"archived": True}


def test_archivar_pagina_sin_id_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.archivar_pagina_notion({})


def test_ejecutar_accion_notion_desconocida_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.ejecutar_accion_notion({"accion": "inexistente", "datos": {}})


def test_actualizar_recordatorio_varios_envia_patch_fecha_y_estado(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("var-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_recordatorio_varios({
            "page_id": "var-1",
            "fecha": "2026-11-25",
            "estado": "Hecha",
        })

    url, kwargs = mock_patch.call_args[0][0], mock_patch.call_args[1]
    assert url == "https://api.notion.com/v1/pages/var-1"
    assert kwargs["json"]["properties"] == {
        "Estado": {"status": {"name": "Hecha"}},
        "Fecha": {"date": {"start": "2026-11-25"}},
    }


def test_actualizar_recordatorio_varios_limpia_fecha_vacia(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("var-2"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_recordatorio_varios({
            "page_id": "var-2",
            "fecha": "",
            "estado": "⏳ Pospuesta",
        })

    props = mock_patch.call_args[1]["json"]["properties"]
    assert props["Fecha"] == {"date": None}
    assert props["Estado"] == {"status": {"name": "⏳ Pospuesta"}}


def test_actualizar_recordatorio_varios_sin_page_id_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.actualizar_recordatorio_varios({"estado": "Hecha"})


def test_actualizar_recordatorio_diario_envia_patch_status(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("dia-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_recordatorio_diario({
            "page_id": "dia-1",
            "estado": "Hecha",
            "tipo_estado": "status",
        })

    url, kwargs = mock_patch.call_args[0][0], mock_patch.call_args[1]
    assert url == "https://api.notion.com/v1/pages/dia-1"
    assert kwargs["json"]["properties"] == {"Estado": {"status": {"name": "Hecha"}}}


def test_actualizar_recordatorio_diario_soporta_select(monkeypatch):
    _preparar_credenciales(monkeypatch)
    mock_patch = Mock(return_value=_mock_respuesta_creada("dia-2"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_recordatorio_diario({
            "page_id": "dia-2",
            "estado": "Hecha",
            "tipo_estado": "select",
        })

    assert mock_patch.call_args[1]["json"]["properties"] == {"Estado": {"select": {"name": "Hecha"}}}


def test_actualizar_recordatorio_diario_incompleto_sale_fatal(monkeypatch):
    _preparar_credenciales(monkeypatch)
    with pytest.raises(SystemExit):
        extract_and_audit.actualizar_recordatorio_diario({"page_id": "dia-1"})


def test_crear_y_actualizar_ingreso(monkeypatch):
    _preparar_credenciales(monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_INGRESOS", "I" * 32)
    mock_post = Mock(return_value=_mock_respuesta_creada("ing-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_ingreso({
            "titulo": "Sueldo",
            "monto": 500000,
            "fecha": "2026-11-01",
            "tipo": "SUELDO",
        })
    body = mock_post.call_args[1]["json"]
    assert body["parent"] == {"database_id": "I" * 32}
    assert body["properties"]["Titulo"] == {"title": [{"text": {"content": "Sueldo"}}]}
    assert body["properties"]["Monto"] == {"number": 500000.0}
    assert body["properties"]["Tipo de Ingreso"] == {"select": {"name": "SUELDO"}}

    mock_patch = Mock(return_value=_mock_respuesta_creada("ing-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_ingreso({
            "page_id": "ing-1",
            "titulo": "Sueldo editado",
            "monto": 550000,
            "fecha": "2026-11-01",
            "tipo": None,
        })
    assert mock_patch.call_args[1]["json"]["properties"]["Tipo de Ingreso"] == {"select": None}


def test_crear_y_actualizar_egreso(monkeypatch):
    _preparar_credenciales(monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_EGRESOS", "E" * 32)
    mock_post = Mock(return_value=_mock_respuesta_creada("egr-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_egreso({
            "nombre": "Supermercado",
            "monto": 35000,
            "monto_usd": None,
            "fecha": "2026-11-21",
            "forma_pago": ["DÉBITO"],
            "tarjeta": "GALICIA",
            "cuotas": 1,
            "categoria": ["SUPERMERCADO"],
            "detalle": "Compra semanal",
        })
    props = mock_post.call_args[1]["json"]["properties"]
    assert props["Nombre del gasto"] == {"title": [{"text": {"content": "Supermercado"}}]}
    assert props["Monto"] == {"number": 35000.0}
    assert props["Forma de pago"] == {"multi_select": [{"name": "DÉBITO"}]}
    assert props["Tarjeta usada"] == {"select": {"name": "GALICIA"}}
    assert props["Cantidad de cuotas"] == {"number": 1}
    assert props["Categoría"] == {"multi_select": [{"name": "SUPERMERCADO"}]}
    assert props["Detalle"] == {"rich_text": [{"text": {"content": "Compra semanal"}}]}


def test_crear_egreso_con_tarjeta_crea_cuotas(monkeypatch):
    _preparar_credenciales(monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_EGRESOS", "E" * 32)
    monkeypatch.setattr(extract_and_audit, "DB_CUOTAS_TARJETA", "T" * 32)

    llamadas = []

    def _mock_post(url, json=None, headers=None, timeout=15):
        llamadas.append(json)
        idx = len(llamadas)
        return _mock_respuesta_creada(f"id-{idx}")

    with patch.object(extract_and_audit.requests, "post", _mock_post):
        extract_and_audit.crear_egreso({
            "nombre": "Zapatillas",
            "monto": 90000,
            "fecha": "2026-11-21",
            "forma_pago": ["TARJETA"],
            "tarjeta": "GALICIA",
            "cuotas": 3,
            "fecha_corte": "2026-11-30",
        })

    # 1 egreso + 3 cuotas
    assert len(llamadas) == 4
    cuota1, cuota2, cuota3 = llamadas[1], llamadas[2], llamadas[3]
    assert cuota1["parent"] == {"database_id": "T" * 32}
    assert cuota1["properties"]["Nombre de cuota"] == {"title": [{"text": {"content": "Cuota n°: 1 - Zapatillas"}}]}
    assert cuota1["properties"]["Monto  por mes en ARS"] == {"number": 30000.0}
    assert cuota1["properties"]["EGRESOS"] == {"relation": [{"id": "id-1"}]}
    assert cuota1["properties"]["Gasto principal"] == {"relation": [{"id": "id-1"}]}
    assert cuota1["properties"]["Fecha de Corte TC"] == {"date": {"start": "2026-11-30"}}
    assert cuota2["properties"]["Fecha de Corte TC"] == {"date": {"start": "2026-12-30"}}
    assert cuota3["properties"]["Fecha de Corte TC"] == {"date": {"start": "2027-01-30"}}
