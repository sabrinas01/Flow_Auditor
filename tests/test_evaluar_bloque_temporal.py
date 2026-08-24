"""
Test de correctitud para evaluar_bloque_temporal (extract_and_audit.py).
No requiere red. Fija la hora "actual" vía una subclase de datetime para
poder probar el borde de medianoche en zona GMT-3 de forma determinista,
sin depender del reloj real de la máquina que corre el test.
"""
import datetime as dt

import extract_and_audit
from extract_and_audit import evaluar_bloque_temporal


class _FixedDatetime(dt.datetime):
    """now() fijo; todo lo demás (strptime, etc.) se hereda sin cambios."""

    _fixed_utc = dt.datetime(2026, 1, 15, 2, 30, 0)

    @classmethod
    def now(cls, tz=None):
        if tz is not None:
            return cls._fixed_utc.replace(tzinfo=tz)
        return cls._fixed_utc


def test_evaluar_bloque_temporal_borde_medianoche_gmt3(monkeypatch):
    # "Ahora" = 2026-01-15 02:30 UTC -> GMT-3 = 2026-01-14 23:30.
    # Elegido a propósito: en UTC ya es 15/01, pero en zona GMT-3 (San Juan)
    # todavía es 14/01. Si la conversión de huso horario estuviera mal (p.ej.
    # usando la fecha UTC sin restar las 3 horas), estos asserts fallarían.
    monkeypatch.setattr(extract_and_audit, "datetime", _FixedDatetime)

    assert evaluar_bloque_temporal("2026-01-14") == "HOY"
    assert evaluar_bloque_temporal("2026-01-13") == "AYER"
    assert evaluar_bloque_temporal("2026-01-15") == "MANANA"


def test_evaluar_bloque_temporal_fuera_de_ventana(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "datetime", _FixedDatetime)

    assert evaluar_bloque_temporal("2026-01-12") is None
    assert evaluar_bloque_temporal("2026-01-16") is None


def test_evaluar_bloque_temporal_ignora_la_hora_del_string(monkeypatch):
    # El campo Fecha de Notion puede venir con hora ("...T23:59:00.000-03:00");
    # la función solo debe mirar la parte de fecha (split en "T").
    monkeypatch.setattr(extract_and_audit, "datetime", _FixedDatetime)

    assert evaluar_bloque_temporal("2026-01-14T23:59:00.000-03:00") == "HOY"
    assert evaluar_bloque_temporal("2026-01-13T00:00:00.000Z") == "AYER"


def test_evaluar_bloque_temporal_entradas_invalidas(monkeypatch):
    monkeypatch.setattr(extract_and_audit, "datetime", _FixedDatetime)

    assert evaluar_bloque_temporal(None) is None
    assert evaluar_bloque_temporal("") is None
    assert evaluar_bloque_temporal("no-es-una-fecha") is None
    assert evaluar_bloque_temporal("2026-13-40") is None  # mes/día inválidos
