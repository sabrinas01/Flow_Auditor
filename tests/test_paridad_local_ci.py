"""
Test de paridad entre la ruta local (.env) y la ruta CI (GitHub Secrets ya
presentes en el entorno) para resolver credenciales — HU "Orquestación y
Bifurcación CI/CD Local", Escenario 3 (Redundancia de Secrets).
No hace llamadas de red ni toca el .env real del repo.
"""
from src.utils.env_helper import get_env_var
import extract_and_audit

# Todos los nombres alternativos que get_env_var acepta para cada credencial —
# se limpian explícitamente al empezar cada test. Sin esto, un .env real local
# (cargado por extract_and_audit al importarse, si existe en este repo) puede
# quedar en os.environ y contaminar el resultado sin que el test se entere.
_NOMBRES_API_KEY = ["NOTION_API_KEY", "NOTION_TOKEN"]
_NOMBRES_DB = ["NOTION_DB_RECORDATORIOS_DIARIOS", "NOTION_DATABASE_ID", "NOTION_DB_ID"]


def _limpiar_entorno(monkeypatch):
    for nombre in _NOMBRES_API_KEY + _NOMBRES_DB:
        monkeypatch.delenv(nombre, raising=False)


def _resolver_credenciales():
    return (
        get_env_var(_NOMBRES_API_KEY, required=True, min_length=20),
        get_env_var(_NOMBRES_DB, required=True, min_length=32),
    )


def test_ruta_local_y_ruta_ci_resuelven_las_mismas_credenciales(tmp_path, monkeypatch):
    valor_key = "A" * 40
    valor_db = "B" * 40

    _limpiar_entorno(monkeypatch)

    # Ruta CI: las variables ya están en el entorno (simulando GitHub Secrets
    # inyectados directamente por el workflow, sin archivo .env de por medio).
    monkeypatch.setenv("NOTION_API_KEY", valor_key)
    monkeypatch.setenv("NOTION_DB_RECORDATORIOS_DIARIOS", valor_db)
    resultado_ci = _resolver_credenciales()

    # Ruta local: las mismas variables llegan vía un archivo .env real, cargado
    # por cargar_env_local() (la misma función que usa el script en producción).
    _limpiar_entorno(monkeypatch)
    env_file = tmp_path / ".env"
    env_file.write_text(
        f"NOTION_API_KEY={valor_key}\nNOTION_DB_RECORDATORIOS_DIARIOS={valor_db}\n",
        encoding="utf-8",
    )
    extract_and_audit.cargar_env_local(env_file)
    resultado_local = _resolver_credenciales()

    # cargar_env_local() escribe directo en os.environ (vía load_dotenv), fuera
    # del tracking de monkeypatch — se limpia explícitamente para no filtrar
    # estos valores de prueba a otros tests de la suite.
    _limpiar_entorno(monkeypatch)

    assert resultado_ci == resultado_local == (valor_key, valor_db)


def test_ruta_local_con_nombres_alternativos_tambien_coincide_con_ci(tmp_path, monkeypatch):
    # Cubre el fallback OR: NOTION_TOKEN / NOTION_DATABASE_ID en vez de los
    # nombres primarios — debe resolver igual sin importar cuál llegue.
    valor_token = "C" * 40
    valor_db_id = "D" * 40

    _limpiar_entorno(monkeypatch)
    monkeypatch.setenv("NOTION_TOKEN", valor_token)
    monkeypatch.setenv("NOTION_DATABASE_ID", valor_db_id)
    resultado_ci = _resolver_credenciales()

    _limpiar_entorno(monkeypatch)
    env_file = tmp_path / ".env"
    env_file.write_text(
        f"NOTION_TOKEN={valor_token}\nNOTION_DATABASE_ID={valor_db_id}\n",
        encoding="utf-8",
    )
    extract_and_audit.cargar_env_local(env_file)
    resultado_local = _resolver_credenciales()
    _limpiar_entorno(monkeypatch)

    assert resultado_ci == resultado_local == (valor_token, valor_db_id)
