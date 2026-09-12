"""
Tests con HTTP mockeado para auditar_consistencia_tripartita (extract_and_audit.py).
No hacen llamadas reales a la red ni tocan los HTML reales del repo:
BASE_DIR se redirige a un directorio temporal con plantillas mínimas.

Recordatorios Diarios (index.html) es fatal ante cualquier fallo (SRS-FR-M1-105).
Recordatorios Varios (recordatorios-varios.html) es aislado y no fatal
(SRS-FR-M4-401): un problema con esa base nunca debe interrumpir ni revertir
la sincronización de Recordatorios Diarios, que corre primero. Solo se
muestran ítems del grupo "Por hacer" ("Sin empezar" / "⏳ Pospuesta" —
excluye En ejecución/En espera y todo el grupo Complete), clasificados según
su propiedad Fecha (v4.26; hasta v4.25 se usaba created_time) en los mismos
tres bloques cronológicos (Ayer/Hoy/Mañana, SRS-FR-M4-402) más un cuarto
bloque "Sin fecha" (nuevo v4.26) para ítems sin Fecha cargada, y ordenados
dentro de cada bloque por Fecha ascendente (Sin fecha se ordena por
created_time, único dato temporal disponible ahí).
"""
from datetime import datetime, timedelta, timezone
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

    const recordatoriosVariosAyer = [];
    const recordatoriosVariosHoy = [];
    const recordatoriosVariosManana = [];
    const recordatoriosVariosSinFecha = [];
</script>
</body></html>"""

PLANTILLA_AGENDA = """<html><body>
<script>
    const timestampLocalStr = "";
    const appVersionStr = "";
    const timestampNextStr = "";
    const timestampServerStr = "";

    const agendaEventosAyer = [];
    const agendaEventosHoy = [];
    const agendaEventosManana = [];
</script>
</body></html>"""


def _preparar_directorio_temporal(tmp_path, monkeypatch, con_pagina_varios=True, con_pagina_agenda=True):
    (tmp_path / "index.html").write_text(PLANTILLA_INDEX, encoding="utf-8")
    if con_pagina_varios:
        (tmp_path / "recordatorios-varios.html").write_text(PLANTILLA_VARIOS, encoding="utf-8")
    if con_pagina_agenda:
        (tmp_path / "agenda-personal.html").write_text(PLANTILLA_AGENDA, encoding="utf-8")
    monkeypatch.setattr(extract_and_audit, "BASE_DIR", tmp_path)
    monkeypatch.setattr(extract_and_audit, "validar_credenciales", lambda: None)
    monkeypatch.setattr(extract_and_audit, "NOTION_API_KEY", "A" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_DIARIOS", "B" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_VARIOS", "C" * 40)
    monkeypatch.setattr(extract_and_audit, "DB_AGENDA_EVENTOS", "D" * 40)


def _mock_respuesta_notion(resultados):
    respuesta = Mock()
    respuesta.raise_for_status = Mock()
    respuesta.json.return_value = {"results": resultados}
    return respuesta


def _hoy_str():
    return (datetime.now(timezone.utc) - timedelta(hours=3)).date().isoformat()


def _hoy_iso_datetime():
    return (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat().replace("+00:00", "Z")


def _pagina_diarios():
    return {
        "properties": {
            "Estado": {"type": "status", "status": {"name": "Hecha"}},
            "Fecha": {"type": "date", "date": {"start": "2026-01-01"}},
        },
        "created_time": "2026-01-01T00:00:00.000Z",
    }


def _pagina_varios(nombre="Lavar gorras", estado="Sin empezar", fecha=None, creada=None, sin_fecha=False):
    """fecha = propiedad Fecha, usada desde v4.26 para clasificar el bloque
    Ayer/Hoy/Mañana (hasta v4.25 se usaba created_time). creada = created_time
    de Notion, usado ahora solo como criterio de orden del bloque "Sin fecha".
    sin_fecha=True construye una página sin la propiedad Fecha cargada (Notion
    devuelve {"date": None} en ese caso), para caer en el bloque "Sin fecha"."""
    return {
        "properties": {
            "Nombre": {"title": [{"plain_text": nombre}]},
            "Estado": {"status": {"name": estado}},
            "Prioridad": {"select": {"name": "MEDIA"}},
            "Área": {"select": {"name": "Higiene"}},
            "Periodo": {"select": {"name": "MENSUAL"}},
            "Fecha": {"date": None} if sin_fecha else {"date": {"start": fecha or _hoy_str()}},
        },
        "created_time": creada or _hoy_iso_datetime(),
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


def _pagina_evento(nombre="Reunión de equipo", inicio=None, fin=None, lugar="Sala C", tipo=None, estado="Pendiente"):
    """Página mock de la BD "Eventos y Recordatorios únicos" (reemplaza en
    v4.25 a "Agenda Personal - Eventos"): Lugar es tipo `place` (no
    `rich_text`), Tipo de tarea es `select`, Estado es `status` — a
    diferencia de la BD anterior, que no tenía ninguna de las dos últimas.
    `estado` por defecto "Pendiente" (grupo to_do, no terminal) para que
    los tests existentes que no ejercitan el filtro de Estado no se vean
    afectados por él."""
    return {
        "properties": {
            "Nombre": {"title": [{"plain_text": nombre}]},
            "Fecha": {"date": {"start": inicio or _hoy_iso_datetime(), "end": fin}},
            "Lugar": {"place": {"name": lugar} if lugar else None},
            "Tipo de tarea": {"select": {"name": tipo} if tipo else None},
            "Estado": {"status": {"name": estado} if estado else None},
        },
        "created_time": _hoy_iso_datetime(),
    }


def _fake_post_multi(respuestas, respuesta_diarios=None):
    """side_effect de requests.post genérico para más de dos bases: `respuestas`
    es un dict {db_id: respuesta_o_excepcion}. Cualquier base no listada
    (típicamente Recordatorios Diarios) responde exitosamente con
    _pagina_diarios() por defecto."""
    def _fake_post(url, *args, **kwargs):
        for db_id, resp in respuestas.items():
            if db_id in url:
                if isinstance(resp, Exception):
                    raise resp
                return resp
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
    # El ítem tiene Fecha de hoy (default) -> cae en recordatoriosVariosHoy
    assert "const recordatoriosVariosAyer = [];" in salida_varios
    assert "const recordatoriosVariosManana = [];" in salida_varios
    assert "Lavar gorras" in salida_varios
    assert '"estado": "Sin empezar"' in salida_varios or '"estado":"Sin empezar"' in salida_varios


def test_recordatorios_varios_clasifica_por_propiedad_fecha(tmp_path, monkeypatch):
    """La clasificación Ayer/Hoy/Mañana usa la propiedad Fecha (v4.26, pedido
    explícito de Sabrina) — hasta v4.25 se usaba created_time. Un ítem creado
    hoy pero con Fecha de mañana debe caer en el bloque Mañana."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    hoy = datetime.now(timezone.utc) - timedelta(hours=3)
    ayer_fecha_str = (hoy - timedelta(days=1)).date().isoformat()
    manana_fecha_str = (hoy + timedelta(days=1)).date().isoformat()

    paginas_varios = [
        _pagina_varios(nombre="Item con fecha ayer", fecha=ayer_fecha_str),
        # created_time es de hoy (default), pero Fecha es de mañana -> Mañana
        _pagina_varios(nombre="Item con fecha manana", fecha=manana_fecha_str),
        _pagina_varios(nombre="Item con fecha hoy"),
    ]
    fake_post = _fake_post_por_db("C" * 40, _mock_respuesta_notion(paginas_varios))

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")

    import re
    def _bloque(nombre_const):
        m = re.search(rf"const\s+{nombre_const}\s*=\s*(\[.*?\])\s*;", salida_varios, re.DOTALL)
        return m.group(1)

    assert "Item con fecha ayer" in _bloque("recordatoriosVariosAyer")
    assert "Item con fecha ayer" not in _bloque("recordatoriosVariosHoy")
    assert "Item con fecha hoy" in _bloque("recordatoriosVariosHoy")
    assert "Item con fecha hoy" not in _bloque("recordatoriosVariosManana")
    assert "Item con fecha manana" in _bloque("recordatoriosVariosManana")
    assert "Item con fecha manana" not in _bloque("recordatoriosVariosHoy")


def test_recordatorios_varios_sin_fecha_cae_en_bloque_propio(tmp_path, monkeypatch):
    """Regla de negocio nueva (v4.26, pedido explícito de Sabrina): un ítem
    "Por hacer" sin la propiedad Fecha cargada no se descarta — cae en un
    cuarto bloque, recordatoriosVariosSinFecha, en vez de desaparecer."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    paginas_varios = [
        _pagina_varios(nombre="Item sin fecha cargada", sin_fecha=True),
        _pagina_varios(nombre="Item con fecha hoy"),
    ]
    fake_post = _fake_post_por_db("C" * 40, _mock_respuesta_notion(paginas_varios))

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")

    import re
    def _bloque(nombre_const):
        m = re.search(rf"const\s+{nombre_const}\s*=\s*(\[.*?\])\s*;", salida_varios, re.DOTALL)
        return m.group(1)

    assert "Item sin fecha cargada" in _bloque("recordatoriosVariosSinFecha")
    assert "Item sin fecha cargada" not in _bloque("recordatoriosVariosHoy")
    assert "Item con fecha hoy" in _bloque("recordatoriosVariosHoy")
    assert "Item con fecha hoy" not in _bloque("recordatoriosVariosSinFecha")


def test_recordatorios_varios_solo_grupo_por_hacer(tmp_path, monkeypatch):
    """Solo se muestran ítems del grupo "Por hacer" de Notion: "Sin empezar" y
    "⏳ Pospuesta". Se excluyen los del grupo "En curso" (En ejecución, En
    espera) y los del grupo "Completado" (Hecha, Hecha por otra persona, No
    necesaria, Fallida/Vencida)."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    paginas_varios = [
        _pagina_varios(nombre="Por hacer sin empezar", estado="Sin empezar"),
        _pagina_varios(nombre="Por hacer pospuesta", estado="⏳ Pospuesta"),
        _pagina_varios(nombre="En curso ejecucion", estado="En ejecución"),
        _pagina_varios(nombre="En curso espera", estado="En espera"),
        _pagina_varios(nombre="Completado hecha", estado="Hecha"),
        _pagina_varios(nombre="Completado hecha por otra persona", estado="Hecha por otra persona"),
        _pagina_varios(nombre="Completado no necesaria", estado="⏭️ No necesaria"),
        _pagina_varios(nombre="Completado fallida", estado="❌ Fallida / Vencida"),
    ]
    fake_post = _fake_post_por_db("C" * 40, _mock_respuesta_notion(paginas_varios))

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")

    assert "Por hacer sin empezar" in salida_varios
    assert "Por hacer pospuesta" in salida_varios
    assert "En curso ejecucion" not in salida_varios
    assert "En curso espera" not in salida_varios
    assert "Completado hecha" not in salida_varios
    assert "Completado hecha por otra persona" not in salida_varios
    assert "Completado no necesaria" not in salida_varios
    assert "Completado fallida" not in salida_varios


def test_recordatorios_varios_ordena_por_fecha_ascendente(tmp_path, monkeypatch):
    """Dentro de un mismo bloque, los ítems quedan ordenados por la propiedad
    Fecha ascendente (v4.26; hasta v4.25 se ordenaba por created_time)."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    hoy = datetime.now(timezone.utc) - timedelta(hours=3)
    temprano = hoy.replace(hour=8, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    medio = hoy.replace(hour=12, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    tarde = hoy.replace(hour=18, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")

    # Se envían fuera de orden a propósito para probar que el backend ordena.
    # created_time queda igual para las tres (hoy, default) para aislar que el
    # orden sale de Fecha y no de un remanente de la lógica vieja.
    paginas_varios = [
        _pagina_varios(nombre="Fecha a la tarde", fecha=tarde),
        _pagina_varios(nombre="Fecha temprano", fecha=temprano),
        _pagina_varios(nombre="Fecha al mediodia", fecha=medio),
    ]
    fake_post = _fake_post_por_db("C" * 40, _mock_respuesta_notion(paginas_varios))

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")

    import re
    m = re.search(r"const\s+recordatoriosVariosHoy\s*=\s*(\[.*?\])\s*;", salida_varios, re.DOTALL)
    bloque_hoy = m.group(1)

    pos_temprano = bloque_hoy.index("Fecha temprano")
    pos_mediodia = bloque_hoy.index("Fecha al mediodia")
    pos_tarde = bloque_hoy.index("Fecha a la tarde")
    assert pos_temprano < pos_mediodia < pos_tarde


def test_recordatorios_varios_no_configurada_no_rompe_diarios(tmp_path, monkeypatch):
    _preparar_directorio_temporal(tmp_path, monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_RECORDATORIOS_VARIOS", None)

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([_pagina_diarios()])):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")
    assert "const recordatoriosVariosAyer = [];" in salida_varios
    assert "const recordatoriosVariosHoy = [];" in salida_varios
    assert "const recordatoriosVariosManana = [];" in salida_varios


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
    assert "const recordatoriosVariosAyer = [];" in salida_varios
    assert "const recordatoriosVariosHoy = [];" in salida_varios
    assert "const recordatoriosVariosManana = [];" in salida_varios


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


# =================================================================
# AGENDA PERSONAL (agenda-personal.html) — SRS-FR-M5-501 a 505
# =================================================================

def test_agenda_personal_eventos_clasifica_ayer_hoy_manana_y_ordena_por_inicio(tmp_path, monkeypatch):
    """Los eventos se clasifican por su propia Fecha.start (no por created_time)
    en las tres ventanas Ayer/Hoy/Mañana (SRS-FR-M5-502) y quedan ordenados
    ascendentemente por hora de inicio dentro de cada bloque. Un evento
    multi-día (empieza ayer, termina mañana) sigue "EN_CURSO" hoy y por eso
    aparece en el bloque Ayer (su fecha programada)."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    hoy = datetime.now(timezone.utc) - timedelta(hours=3)
    ayer = hoy - timedelta(days=1)
    manana = hoy + timedelta(days=1)
    temprano = hoy.replace(hour=9, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    tarde = hoy.replace(hour=15, minute=30, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    manana_iso = manana.replace(hour=10, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    ayer_iso = ayer.replace(hour=0, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    fin_multidia = manana.replace(hour=23, minute=59, second=0, microsecond=0).isoformat().replace("+00:00", "Z")

    eventos = [
        _pagina_evento(nombre="Revisión de código", inicio=tarde, lugar="Oficina"),
        _pagina_evento(nombre="Reunión de equipo", inicio=temprano, lugar="Sala C / Zoom"),
        _pagina_evento(nombre="Entrega de auditoría", inicio=manana_iso, lugar=None),
        _pagina_evento(nombre="Mudanza (multi-día)", inicio=ayer_iso, fin=fin_multidia, lugar="Depósito"),
    ]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")

    import re
    def _bloque(nombre_const):
        m = re.search(rf"const\s+{nombre_const}\s*=\s*(\[.*?\])\s*;", salida_agenda, re.DOTALL)
        return m.group(1)

    bloque_hoy = _bloque("agendaEventosHoy")
    assert "Entrega de auditoría" not in bloque_hoy
    assert bloque_hoy.index("Reunión de equipo") < bloque_hoy.index("Revisión de código")
    assert "Entrega de auditoría" in _bloque("agendaEventosManana")
    assert "Mudanza (multi-día)" in _bloque("agendaEventosAyer")


def test_agenda_personal_eventos_finalizado_se_descarta(tmp_path, monkeypatch):
    """Regla de negocio (SRS-FR-M5-502, pedido explícito de Sabrina): solo se
    muestran eventos en estado "SIN_EMPEZAR" o "EN_CURSO" — un evento ya
    finalizado se descarta aunque su fecha programada caiga en una de las
    tres ventanas cronológicas."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    hoy = datetime.now(timezone.utc) - timedelta(hours=3)
    ayer = hoy - timedelta(days=1)
    # Sin `fin` explícito, se considera vigente hasta las 23:59:59 de su
    # propio día -> un evento de ayer sin fin ya está FINALIZADO hoy.
    ayer_sin_fin = ayer.replace(hour=10, minute=0, second=0, microsecond=0).isoformat().replace("+00:00", "Z")
    # Evento de hoy que ya terminó hace una hora.
    hoy_finalizado_inicio = (hoy - timedelta(hours=2)).isoformat().replace("+00:00", "Z")
    hoy_finalizado_fin = (hoy - timedelta(hours=1)).isoformat().replace("+00:00", "Z")

    eventos = [
        _pagina_evento(nombre="Evento de ayer sin fin", inicio=ayer_sin_fin),
        _pagina_evento(nombre="Evento de hoy ya terminado", inicio=hoy_finalizado_inicio, fin=hoy_finalizado_fin),
    ]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "Evento de ayer sin fin" not in salida_agenda
    assert "Evento de hoy ya terminado" not in salida_agenda


def test_agenda_personal_eventos_incluye_tipo_de_tarea(tmp_path, monkeypatch):
    """Escenario 2 (HU Notion Épica 2 #8, SRS-FR-M5-505): un evento con la
    propiedad 'Tipo de tarea' cargada en Notion debe incluir ese valor en el
    JSON inyectado como clave 'tipo', junto al 'lugar'."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    eventos = [_pagina_evento(nombre="Turno médico", lugar="Clínica Central", tipo="ESTUDIO MÉDICO")]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "ESTUDIO MÉDICO" in salida_agenda
    assert "Clínica Central" in salida_agenda


def test_agenda_personal_eventos_sin_tipo_no_rompe(tmp_path, monkeypatch):
    """Escenario 3 (HU Notion Épica 2 #8): un evento sin 'Tipo de tarea'
    cargado no debe romper la sincronización — el campo 'tipo' queda en
    null/None en vez de faltar la clave o abortar el proceso."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    eventos = [_pagina_evento(nombre="Reunión sin tipo", lugar="Oficina", tipo=None)]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "Reunión sin tipo" in salida_agenda
    assert '"tipo": null' in salida_agenda


def test_agenda_personal_eventos_estado_terminal_se_descarta(tmp_path, monkeypatch):
    """Regla de negocio nueva (SRS-FR-M5-502, v4.25, pedido explícito de
    Sabrina): un evento en un Estado terminal de Notion (Hecha, Sin asistir,
    Asisti) se descarta aunque su estado temporal sea SIN_EMPEZAR o EN_CURSO."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    hoy_iso = _hoy_iso_datetime()
    eventos = [
        _pagina_evento(nombre="Evento ya hecho", inicio=hoy_iso, estado="Hecha"),
        _pagina_evento(nombre="Evento sin asistir", inicio=hoy_iso, estado="Sin asistir"),
        _pagina_evento(nombre="Evento asisti", inicio=hoy_iso, estado="Asisti"),
        _pagina_evento(nombre="Evento en curso activo", inicio=hoy_iso, estado="En curso"),
    ]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "Evento ya hecho" not in salida_agenda
    assert "Evento sin asistir" not in salida_agenda
    assert "Evento asisti" not in salida_agenda
    assert "Evento en curso activo" in salida_agenda


def test_agenda_personal_eventos_sin_estado_no_se_oculta(tmp_path, monkeypatch):
    """Un evento sin la propiedad Estado cargada se muestra igual (fail-open):
    la ausencia del dato no debe ocultarlo."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    eventos = [_pagina_evento(nombre="Evento sin estado cargado", estado=None)]
    fake_post = _fake_post_multi({"D" * 40: _mock_respuesta_notion(eventos)})

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "Evento sin estado cargado" in salida_agenda


def test_agenda_personal_eventos_401_no_afecta_otros_modulos(tmp_path, monkeypatch, capsys):
    """Un fallo HTTP al consultar Agenda Eventos es aislado: no debe abortar
    ni afectar Recordatorios Diarios ni Recordatorios Varios (SRS-FR-M5-501)."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)

    respuesta_401 = Mock()
    respuesta_401.status_code = 401
    error_401 = requests.exceptions.HTTPError(response=respuesta_401)

    fake_post = _fake_post_multi({
        "D" * 40: error_401,
        "C" * 40: _mock_respuesta_notion([_pagina_varios(nombre="Lavar gorras")]),
    })

    with patch.object(extract_and_audit.requests, "post", side_effect=fake_post):
        extract_and_audit.auditar_consistencia_tripartita()

    salida = capsys.readouterr().out
    assert "✅ Frontend index.html sincronizado" in salida
    assert "AGENDA EVENTOS" in salida

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_varios = (tmp_path / "recordatorios-varios.html").read_text(encoding="utf-8")
    assert "Lavar gorras" in salida_varios

    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "const agendaEventosAyer = [];" in salida_agenda
    assert "const agendaEventosHoy = [];" in salida_agenda
    assert "const agendaEventosManana = [];" in salida_agenda


def test_agenda_personal_no_configurada_no_rompe_nada(tmp_path, monkeypatch):
    """Sin la BD de Eventos configurada, el resto del pipeline sigue
    funcionando normalmente y agenda-personal.html queda con listas vacías."""
    _preparar_directorio_temporal(tmp_path, monkeypatch)
    monkeypatch.setattr(extract_and_audit, "DB_AGENDA_EVENTOS", None)

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([_pagina_diarios()])):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    salida_agenda = (tmp_path / "agenda-personal.html").read_text(encoding="utf-8")
    assert "const agendaEventosAyer = [];" in salida_agenda
    assert "const agendaEventosHoy = [];" in salida_agenda
    assert "const agendaEventosManana = [];" in salida_agenda


def test_agenda_personal_sin_archivo_no_rompe_nada(tmp_path, monkeypatch):
    """Si agenda-personal.html no existe todavía en este entorno, se omite sin
    afectar la sincronización de los otros dos frontends."""
    _preparar_directorio_temporal(tmp_path, monkeypatch, con_pagina_agenda=False)

    with patch.object(extract_and_audit.requests, "post", return_value=_mock_respuesta_notion([_pagina_diarios()])):
        extract_and_audit.auditar_consistencia_tripartita()

    assert 'const timestampLocalStr = "";' not in (tmp_path / "index.html").read_text(encoding="utf-8")
    assert not (tmp_path / "agenda-personal.html").exists()
