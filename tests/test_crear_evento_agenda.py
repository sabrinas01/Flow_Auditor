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


def test_crear_sesion_ciclo_y_pendiente_salud(monkeypatch):
    _preparar_credenciales(monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_SESIONES", "S" * 32)
    monkeypatch.setattr(extract_and_audit, "DB_CICLO", "C" * 32)
    monkeypatch.setattr(extract_and_audit, "DB_SALUD_PENDIENTES", "P" * 32)

    mock_post = Mock(return_value=_mock_respuesta_creada("sal-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_sesion_salud({
            "nombre": "Caminata",
            "fecha": "2026-11-21",
            "duracion": 40,
            "estado": "Hecha",
        })
        assert mock_post.call_args[1]["json"]["properties"]["Duración (en min)"] == {"number": 40.0}

        extract_and_audit.crear_fase_ciclo({
            "nombre": "[11]-Fase Folicular",
            "inicio": "2026-11-21",
            "fin": "2026-11-28",
            "sintomas": ["Cansancio físico"],
        })
        assert mock_post.call_args[1]["json"]["properties"]["Duración de la fase"] == {
            "date": {"start": "2026-11-21", "end": "2026-11-28"}
        }

        extract_and_audit.crear_pendiente_salud({
            "nombre": "Sacar turno",
            "tipo": "💬 Pedir turno",
            "fecha_limite": "2026-11-29",
            "estado": "Pendiente",
        })
        assert mock_post.call_args[1]["json"]["properties"]["Nombre de tarea"] == {
            "title": [{"text": {"content": "Sacar turno"}}]
        }

    mock_patch = Mock(return_value=_mock_respuesta_creada("cic-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_fase_ciclo({
            "page_id": "cic-1",
            "nombre": "[11]-Fase Folicular",
            "inicio": "2026-11-21",
            "fin": "2026-11-28",
            "sintomas": [],
        })
    props = mock_patch.call_args[1]["json"]["properties"]
    assert props["Finalización (real)"] == {"date": None}
    assert props["Síntomas"] == {"multi_select": []}


def test_crear_y_actualizar_libro_ocio(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_LIBROS", "17ba38bb7a6e80fbabd1e13ae0a85b69")

    mock_post = Mock(return_value=_mock_respuesta_creada("lib-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_libro_ocio({
            "titulo": "El Principito",
            "autor": "Antoine de Saint-Exupéry",
            "categoria": "Ficción",
            "estado": "Leyendo",
            "puntuacion": 5,
        })
    body = mock_post.call_args[1]["json"]
    assert body["parent"] == {"database_id": "17ba38bb7a6e80fbabd1e13ae0a85b69"}
    assert body["icon"] == {"type": "icon", "icon": {"name": "book-closed", "color": "gray"}}
    assert body["properties"]["Title"] == {"title": [{"text": {"content": "El Principito"}}]}
    assert body["properties"]["Valoración"] == {"select": {"name": "⭐️⭐️⭐️⭐️⭐️"}}

    mock_patch = Mock(return_value=_mock_respuesta_creada("lib-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_libro_ocio({
            "page_id": "lib-1",
            "titulo": "El Principito",
            "estado": "Completado",
        })
    assert mock_patch.call_args[1]["json"]["properties"]["Estado"] == {"status": {"name": "Completado"}}


def test_crear_serie_y_actualizar_pelicula_ocio(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_SERIES", "17ca38bb7a6e816e8a60e32f044f891f")
    monkeypatch.setattr(extract_and_audit, "DB_PELICULAS", "17ca38bb7a6e81e68b21ef264e76a001")

    mock_post = Mock(return_value=_mock_respuesta_creada("ser-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_serie_ocio({
            "titulo": "The Bear",
            "generos": ["drama", "comedia"],
            "estado": "VIENDO",
            "puntuacion": 5,
        })
    body = mock_post.call_args[1]["json"]
    assert body["parent"] == {"database_id": "17ca38bb7a6e816e8a60e32f044f891f"}
    assert body["icon"] == {"type": "emoji", "emoji": "🟩"}
    assert body["properties"]["Género"] == {"multi_select": [{"name": "drama"}, {"name": "comedia"}]}
    assert body["properties"]["Estado"] == {"select": {"name": "VIENDO"}}

    mock_patch = Mock(return_value=_mock_respuesta_creada("pel-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_pelicula_ocio({
            "page_id": "pel-1",
            "titulo": "Dune 2",
            "generos": ["acción"],
            "estado": "VISTA",
            "puntuacion": 5,
        })
    assert mock_patch.call_args[1]["json"]["properties"]["Estado"] == {"select": {"name": "VISTA"}}


def test_crear_y_actualizar_registro_emocional(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_GESTION_EMOCIONAL", "9a7a38bb7a6e8303be4b81797e888fe5")

    mock_post = Mock(return_value=_mock_respuesta_creada("emo-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_registro_emocional({
            "nombre": "Pausa tarde",
            "fecha": "2026-11-23",
            "barometro": "😌 En calma",
            "calma": 8,
            "energia": 7,
            "stop": True,
        })
    body = mock_post.call_args[1]["json"]
    assert body["parent"] == {"database_id": "9a7a38bb7a6e8303be4b81797e888fe5"}
    assert body["icon"] == {"type": "emoji", "emoji": "🧠"}
    assert body["properties"]["Protocolo S.T.O.P."] == {"checkbox": True}
    assert body["properties"]["Barómetro"] == {"select": {"name": "😌 En calma"}}

    mock_patch = Mock(return_value=_mock_respuesta_creada("emo-1"))
    with patch.object(extract_and_audit.requests, "patch", mock_patch):
        extract_and_audit.actualizar_registro_emocional({
            "page_id": "emo-1",
            "nombre": "Pausa tarde",
            "fecha": "2026-11-23",
            "calma": 9,
            "stop": False,
        })
    assert mock_patch.call_args[1]["json"]["properties"]["Nivel de calma"] == {"number": 9.0}


def test_crear_afirmacion_y_frase_relaciones(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_RELACIONES", "421a38bb7a6e80e8ac8bd4543ce353b4")
    monkeypatch.setattr(extract_and_audit, "DB_FRASES", "1dda38bb7a6e8055a328fc8bd816bd7d")

    mock_post = Mock(return_value=_mock_respuesta_creada("rel-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_afirmacion_relacion({
            "nombre": "Mi tiempo vale",
            "categoria": "🛡️ Autorrespeto",
            "integrada": True,
        })
        assert mock_post.call_args[1]["json"]["properties"]["Integrada"] == {"checkbox": True}

        extract_and_audit.crear_frase_relacion({
            "frase": "Elegir tu paz no es egoísmo.",
            "autor": "Sabry",
        })
        assert mock_post.call_args[1]["json"]["properties"]["Frase"] == {"title": [{"text": {"content": "Elegir tu paz no es egoísmo."}}]}


def test_crear_desarrollo_personal(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_DESARROLLO_PERSONAL", "422a38bb7a6e8190992bd07ad1f80f30")

    mock_post = Mock(return_value=_mock_respuesta_creada("dp-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_desarrollo_personal({
            "nombre": "Escucha activa 3s",
            "pilar": "🗣️ Comunicación",
            "tipo": "🏋️ Ejercicio práctico",
            "estado": "En curso",
            "fecha": "2026-11-24",
            "frecuencia_tecnica": "DIARIO • 5 MIN",
            "puntaje": 9,
            "nota": "Pausa antes de responder",
        })
        props = mock_post.call_args[1]["json"]["properties"]
        assert props["Nombre"] == {"title": [{"text": {"content": "Escucha activa 3s"}}]}
        assert props["Pilar"] == {"select": {"name": "🗣️ Comunicación"}}
        assert props["Puntaje / Alineación"] == {"number": 9.0}


def test_guardar_cita_libro_ocio(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_LIBROS", "L" * 32)

    mock_post = Mock(return_value=_mock_respuesta_creada("lib-ocr-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.guardar_cita_libro_ocio({
            "titulo": "Hábitos Atómicos",
            "autor": "James Clear",
            "texto": "Los hábitos son el interés compuesto de la mejora personal.",
        })
        body = mock_post.call_args[1]["json"]
        assert body["properties"]["Title"] == {"title": [{"text": {"content": "Hábitos Atómicos"}}]}
        assert body["children"][0]["quote"]["rich_text"][0]["text"]["content"].startswith("Los hábitos")


def test_crear_habito_disciplina(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "secret-token-de-prueba")
    monkeypatch.setattr(extract_and_audit, "DB_HABITOS", "422a38bb7a6e805bb6feccf2829c847d")

    mock_post = Mock(return_value=_mock_respuesta_creada("hab-1"))
    with patch.object(extract_and_audit.requests, "post", mock_post):
        extract_and_audit.crear_habito_disciplina({
            "nombre": "Leer 10 páginas",
            "modulo": "🔥 Hábito",
            "estado": "Activo",
            "racha_progreso": 7,
        })
        props = mock_post.call_args[1]["json"]["properties"]
        assert props["Nombre"] == {"title": [{"text": {"content": "Leer 10 páginas"}}]}
        assert props["Módulo"] == {"select": {"name": "🔥 Hábito"}}
        assert props["Racha / Progreso"] == {"number": 7.0}
