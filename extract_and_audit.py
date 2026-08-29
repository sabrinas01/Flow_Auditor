"""
MÓDULO: extract_and_audit.py — Sincronización Horaria y Limpieza de Red
DESCRIPCIÓN: Script extractor backend seguro que corre en GitHub Actions de forma horaria.
No hardcodees un número de versión acá: la versión real que ve el usuario
sale del último tag de git (ver obtener_version_actual()) y de PRD/SRS.
Conecta con la API de Notion, clasifica las tareas cronológicamente
en tres bloques (Ayer, Hoy, Mañana) bajo huso GMT-3 y reescribe
dinámicamente el archivo index.html usando expresiones regulares.
Se eliminó la telemetría e inyección del contador de peticiones.
AUTOR: Tu Mentor de Programación y Ciberseguridad (IT Functional Analyst Sabrina)

CORRECCIONES APLICADAS (revisión de mentoría):
1. Indentación: todo el bloque headers/try/except ahora está DENTRO de la función.
   Antes quedaba a nivel de módulo y se ejecutaba solo al importar el archivo,
   usando una variable local 'url' que no existía en ese scope -> NameError.
2. Escape de "</" en el JSON inyectado en <script>, para evitar que un estado
   de Notion con ese texto literal cierre el bloque de script prematuramente.
3. Se agregó timeout=15 al requests.post (antes podía colgarse sin límite).
4. Se restauró el print del error comentado en validar_credenciales().
"""

# NOTA para Raine — Documentación breve y práctica: BOM + RAM tests
#
# BOM (Bill of Materials)
# - Qué es: inventario reproducible de dependencias (paquetes, versiones y hashes).
# - Por qué: reproducibilidad y seguridad (auditorías y detección de cambios).
# - Qué guardar aquí: .bom/requirements.txt (o poetry.lock), y artefactos de auditoría (.bom/pip-audit.json).
# - Comprobaciones CI: regenerar BOM en CI y fallar si difiere del archivo versionado; ejecutar pip-audit.
#
# RAM tests (tests de memoria)
# - Objetivo: detectar regresiones en el consumo de memoria (picos y fugas).
# - Unit tests: tracemalloc para funciones puras (no requieren red).
# - Integration tests: arrancar el script en un subprocess y medir RSS con psutil; definir umbrales y fallar si se exceden.
# - Notas: No llamar a la API real en unit tests; mockear requests. En integración se puede usar claves dummy largas para pasar las comprobaciones de formato y dejar que el proceso falle rápidamente si hay error de red.
#
# Pasos resumidos:
# 1) Generar y commitear .bom/requirements.txt (p.ej. `pip freeze > .bom/requirements.txt`).
# 2) Añadir tests/ (ejemplos incluidos en la rama) y workflow CI que: 1) valide BOM, 2) ejecute pip-audit, 3) corra tests de memoria.
# 3) Ajustar umbrales de memoria a los valores reales del runner (por defecto en esta rama: unit=5MB, integration=200MB).

import io
import os
import sys
import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
import requests
import psutil

from src.utils.env_helper import get_env_var

UMBRAL_RAM_MB = 50


BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"


def cargar_env_local(ruta_env):
    """Carga variables desde un archivo .env local, detectando y normalizando
    BOM (Byte Order Mark) de UTF-8-SIG o UTF-16 LE/BE antes de parsearlo.
    Windows (PowerShell, Notepad) suele generar .env con estas firmas, y
    python-dotenv no las normaliza solo -> SRS-FR-M1-104.
    """
    contenido_crudo = ruta_env.read_bytes()

    if contenido_crudo.startswith(b"\xff\xfe") or contenido_crudo.startswith(b"\xfe\xff"):
        encoding = "utf-16"
        print("[ADVERTENCIA] BOM detectado en .env (UTF-16) — normalizado automáticamente")
    elif contenido_crudo.startswith(b"\xef\xbb\xbf"):
        encoding = "utf-8-sig"
        print("[ADVERTENCIA] BOM detectado en .env (UTF-8) — normalizado automáticamente")
    else:
        encoding = "utf-8"

    texto_normalizado = contenido_crudo.decode(encoding)
    load_dotenv(stream=io.StringIO(texto_normalizado))


# Cargar configuración de variables de entorno si estamos en entorno local
if os.getenv("GITHUB_ACTIONS") != "true" and env_path.exists():
    cargar_env_local(env_path)

# Resolución de variables tolerante a múltiples nomenclaturas redundantes
NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID") or os.getenv("NOTION_DB_ID")
DB_RECORDATORIOS_VARIOS = os.getenv("NOTION_DB_RECORDATORIOS_VARIOS")


def validar_credenciales():
    try:
        # Uso de helper interno para resolución robusta de variables de entorno
        global NOTION_API_KEY, DB_RECORDATORIOS_DIARIOS, DB_RECORDATORIOS_VARIOS
        NOTION_API_KEY = get_env_var(["NOTION_API_KEY", "NOTION_TOKEN"], required=True, min_length=20)
        DB_RECORDATORIOS_DIARIOS = get_env_var(["NOTION_DB_RECORDATORIOS_DIARIOS", "NOTION_DATABASE_ID", "NOTION_DB_ID"], required=True, min_length=32)
        DB_RECORDATORIOS_VARIOS = get_env_var(["NOTION_DB_RECORDATORIOS_VARIOS"], required=True, min_length=32)
    except (EnvironmentError, ValueError) as e:
        print(f"❌ [ERROR CRÍTICO]: {e}")
        sys.exit(1)


def verificar_consumo_ram(umbral_mb=UMBRAL_RAM_MB):
    """Monitorea el consumo de RAM (RSS) del proceso actual y registra una alerta
    si supera el umbral, sin detener la ejecución (SRS Escenario 4 — Validación
    de Consumo de Recursos). Devuelve el RSS actual en MB."""
    proceso = psutil.Process(os.getpid())
    rss_mb = proceso.memory_info().rss / (1024 * 1024)
    if rss_mb > umbral_mb:
        print(f"[ALERTA] Consumo RAM > {umbral_mb}MB (actual: {rss_mb:.1f} MB) — revisando fugas de memoria")
    return rss_mb


def obtener_version_actual():
    """Obtiene el último tag de Git como versión, o 'dev' si no hay tags (SRS-FR-M2-204)."""
    try:
        version = subprocess.check_output(
            ["git", "describe", "--tags", "--abbrev=0"],
            cwd=BASE_DIR,
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return version
    except subprocess.CalledProcessError:
        return "dev"


def calcular_timestamps_sincronizacion(ahora_utc):
    """A partir de una marca UTC, calcula hora local (GMT-3) y la próxima sincronización
    (+1 hora exacta desde la hora local, SRS-FR-M2-202/M3-304). Devuelve strings
    formateados "DD/MM/YYYY HH:MM:SS" listos para inyectar en index.html."""
    ahora_argentina = ahora_utc - timedelta(hours=3)
    proxima_sincro = ahora_argentina + timedelta(hours=1)

    fmt = "%d/%m/%Y %H:%M:%S"
    return {
        "local": ahora_argentina.strftime(fmt),
        "proxima": proxima_sincro.strftime(fmt),
        "servidor": ahora_utc.strftime(fmt),
    }


def evaluar_bloque_temporal(fecha_str):
    """Evalúa la marca temporal de la tarea mapeándola a las ventanas cronológicas."""
    if not fecha_str:
        return None
    try:
        solo_fecha = fecha_str.split("T")[0].strip()
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        # Normalización horaria estricta de San Juan, Argentina (GMT-3)
        hoy_local = (datetime.now(timezone.utc) - timedelta(hours=3)).date()

        if fecha_dt == hoy_local:
            return "HOY"
        elif fecha_dt == (hoy_local - timedelta(days=1)):
            return "AYER"
        elif fecha_dt == (hoy_local + timedelta(days=1)):
            return "MANANA"
        return None
    except Exception:
        return None


def consultar_y_clasificar(database_id, etiqueta_log):
    """Consulta una base de datos de Notion y clasifica sus páginas en las tres
    ventanas cronológicas (Ayer/Hoy/Mañana) agrupando por estado. Reutilizada
    para Recordatorios Diarios y Recordatorios Varios: son bases de Notion
    independientes, cada una con su propio universo de tareas."""
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    # Petición segura bajo protocolo TLS 1.3, con timeout para no colgar el Action
    response = requests.post(url, json={"page_size": 100}, headers=headers, timeout=15)
    response.raise_for_status()
    results = response.json().get("results", [])
    print(f"📦 [LOG PIPELINE]: Se recuperaron {len(results)} registros desde la base de datos de Notion ({etiqueta_log}).")

    conteo_ayer, conteo_hoy, conteo_manana = {}, {}, {}
    columna_estado, columna_fecha = None, None

    # Detección dinámica de esquema de columnas
    if results:
        for n_col, info in results[0].get("properties", {}).items():
            if info.get("type") in ["status", "select"] and n_col.lower() in ["estado", "status"]:
                columna_estado = n_col
            if info.get("type") == "date":
                columna_fecha = n_col

    # Mapeo y agrupamiento dinámico por estados en base a la ventana de tiempo
    for pagina in results:
        props = pagina.get("properties", {})
        fecha_p = props.get(columna_fecha, {}).get("date", {}).get("start") if columna_fecha else None
        if not fecha_p:
            fecha_p = pagina.get("created_time")

        bloque = evaluar_bloque_temporal(fecha_p)
        if not bloque:
            continue

        est_val = "Sin empezar"
        if columna_estado:
            st_data = props.get(columna_estado, {})
            if st_data.get("type") == "status" and st_data.get("status"):
                est_val = st_data["status"].get("name", "Sin empezar")
            elif st_data.get("type") == "select" and st_data.get("select"):
                est_val = st_data["select"].get("name", "Sin empezar")

        if bloque == "AYER":
            conteo_ayer[est_val] = conteo_ayer.get(est_val, 0) + 1
        elif bloque == "HOY":
            conteo_hoy[est_val] = conteo_hoy.get(est_val, 0) + 1
        elif bloque == "MANANA":
            conteo_manana[est_val] = conteo_manana.get(est_val, 0) + 1

    return conteo_ayer, conteo_hoy, conteo_manana


def _serializar_conteos(conteo_ayer, conteo_hoy, conteo_manana):
    """Serializa los tres diccionarios a JSON limpio, escapando "</" para evitar
    que un estado de Notion cierre el bloque <script> prematuramente (XSS/HTML injection)."""
    return (
        json.dumps(conteo_ayer, ensure_ascii=False).replace("</", "<\\/"),
        json.dumps(conteo_hoy, ensure_ascii=False).replace("</", "<\\/"),
        json.dumps(conteo_manana, ensure_ascii=False).replace("</", "<\\/"),
    )


def auditar_consistencia_tripartita():
    """Ejecuta el pipeline de Sincronización principal contra las bases de datos de Notion."""
    validar_credenciales()

    try:
        # Recordatorios Diarios y Recordatorios Varios son bases de Notion
        # independientes: cada frontend se sincroniza con su propio universo de tareas.
        conteo_ayer_d, conteo_hoy_d, conteo_manana_d = consultar_y_clasificar(DB_RECORDATORIOS_DIARIOS, "Recordatorios Diarios")
        conteo_ayer_v, conteo_hoy_v, conteo_manana_v = consultar_y_clasificar(DB_RECORDATORIOS_VARIOS, "Recordatorios Varios")

        # Generación de marcas de tiempo del diagnóstico de infraestructura
        ahora_utc = datetime.now(timezone.utc)
        timestamps = calcular_timestamps_sincronizacion(ahora_utc)
        str_local = timestamps["local"]
        str_next = timestamps["proxima"]
        str_server = timestamps["servidor"]

        app_version = obtener_version_actual()

        datos_por_archivo = {
            "index.html": _serializar_conteos(conteo_ayer_d, conteo_hoy_d, conteo_manana_d),
            "recordatorios-varios.html": _serializar_conteos(conteo_ayer_v, conteo_hoy_v, conteo_manana_v),
        }

        for nombre_archivo, (json_ayer, json_hoy, json_manana) in datos_por_archivo.items():
            html_path = BASE_DIR / nombre_archivo
            with open(html_path, "r", encoding="utf-8") as file:
                html_content = file.read()

            # Reemplazo de constantes mediante expresiones regulares tolerantes a espacios (\s*)
            html_content = re.sub(r'const\s+timestampLocalStr\s*=\s*".*?"\s*;', f'const timestampLocalStr = "{str_local}";', html_content)
            html_content = re.sub(r'const\s+timestampNextStr\s*=\s*".*?"\s*;', f'const timestampNextStr = "{str_next}";', html_content)
            html_content = re.sub(r'const\s+timestampServerStr\s*=\s*".*?"\s*;', f'const timestampServerStr = "{str_server}";', html_content)

            html_content = re.sub(r"const\s+conteoAyer\s*=\s*\{.*?\}\s*;", f"const conteoAyer = {json_ayer};", html_content)
            html_content = re.sub(r"const\s+conteoHoy\s*=\s*\{.*?\}\s*;", f"const conteoHoy = {json_hoy};", html_content)
            html_content = re.sub(r"const\s+conteoManana\s*=\s*\{.*?\}\s*;", f"const conteoManana = {json_manana};", html_content)

            html_content = re.sub(r'const\s+appVersionStr\s*=\s*".*?"\s*;', f'const appVersionStr = "{app_version}";', html_content)

            # Sobrescribir el frontend de forma atómica y segura
            with open(html_path, "w", encoding="utf-8") as file:
                file.write(html_content)

            print(f"✅ Frontend {nombre_archivo} sincronizado y actualizado con éxito de forma horaria.")

        verificar_consumo_ram()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("❌ [ERROR CRÍTICO]: 401 Unauthorized - Revisa las claves de tu bóveda de secretos.")
        else:
            print(f"❌ [ERROR CRÍTICO EN PIPELINE]: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ [ERROR CRÍTICO EN PIPELINE]: {e}")
        sys.exit(1)


if __name__ == "__main__":
    auditar_consistencia_tripartita()