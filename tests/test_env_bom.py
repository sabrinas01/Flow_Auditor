"""
Tests para cargar_env_local (extract_and_audit.py) — SRS-FR-M1-104.
Verifica que un .env con BOM (UTF-8-SIG o UTF-16 LE/BE), como los que
genera PowerShell en Windows, se detecte, se normalice y se cargue
correctamente, y que un .env sin BOM siga funcionando igual que antes.
"""
import os

import extract_and_audit
from extract_and_audit import cargar_env_local

VAR_DE_PRUEBA = "NFA_TEST_BOM_VAR"
CONTENIDO_ENV = f'{VAR_DE_PRUEBA}=valor_de_prueba_123\n'


def _cargar_y_verificar(tmp_path, monkeypatch, bytes_env):
    monkeypatch.delenv(VAR_DE_PRUEBA, raising=False)
    ruta_env = tmp_path / ".env"
    ruta_env.write_bytes(bytes_env)

    try:
        cargar_env_local(ruta_env)
        assert os.environ.get(VAR_DE_PRUEBA) == "valor_de_prueba_123"
    finally:
        monkeypatch.delenv(VAR_DE_PRUEBA, raising=False)


def test_env_sin_bom_utf8_plano(tmp_path, monkeypatch, capsys):
    _cargar_y_verificar(tmp_path, monkeypatch, CONTENIDO_ENV.encode("utf-8"))
    assert "ADVERTENCIA" not in capsys.readouterr().out


def test_env_con_bom_utf8_sig(tmp_path, monkeypatch, capsys):
    _cargar_y_verificar(tmp_path, monkeypatch, CONTENIDO_ENV.encode("utf-8-sig"))
    salida = capsys.readouterr().out
    assert "ADVERTENCIA" in salida
    assert "UTF-8" in salida


def test_env_con_bom_utf16_le(tmp_path, monkeypatch, capsys):
    # "utf-16" en Python antepone el BOM LE (\xff\xfe) por defecto en esta plataforma
    _cargar_y_verificar(tmp_path, monkeypatch, CONTENIDO_ENV.encode("utf-16"))
    salida = capsys.readouterr().out
    assert "ADVERTENCIA" in salida
    assert "UTF-16" in salida


def test_env_con_bom_utf16_be(tmp_path, monkeypatch, capsys):
    bytes_be = b"\xfe\xff" + CONTENIDO_ENV.encode("utf-16-be")
    _cargar_y_verificar(tmp_path, monkeypatch, bytes_be)
    salida = capsys.readouterr().out
    assert "ADVERTENCIA" in salida
    assert "UTF-16" in salida
