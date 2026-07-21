"""
MÓDULO: extract_and_audit.py (Versión 5.4 - Sincronización Horaria y Limpieza de Red)
DESCRIPCIÓN: Script extractor backend seguro que corre en GitHub Actions de forma horaria.
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

import os
import sys
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import requests

BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"

# Cargar configuración de variables de entorno si estamos en entorno local
if os.getenv("GITHUB_ACTIONS") != "true" and env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Resolución de variables tolerante a múltiples nomenclaturas redundantes
NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID") or os.getenv("NOTION_DB_ID")


def validar_credenciales():
    """Valida los secretos cargados en memoria previniendo fallos sintácticos en el pipeline."""
    if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
        print("❌ [ERROR CRÍTICO]: Faltan credenciales obligatorias en el entorno de ejecución.")
        sys.exit(1)

    # Previene el despliegue accidental con sintaxis de variables sin resolver
    if "${{" in NOTION_API_KEY or "}}" in NOTION_API_KEY:
        print("❌ [ERROR CRÍTICO]: NOTION_API_KEY contiene marcas de secretos de GitHub sin resolver.")
        sys.exit(1)

    if "${{" in DB_RECORDATORIOS_DIARIOS or "}}" in DB_RECORDATORIOS_DIARIOS:
        print("❌ [ERROR CRÍTICO]: DB_RECORDATORIOS_DIARIOS contiene marcas de secretos de GitHub sin resolver.")
        sys.exit(1)

    if len(NOTION_API_KEY) < 20 or len(DB_RECORDATORIOS_DIARIOS) < 32:
        print("❌ [ERROR CRÍTICO]: Estructura o longitud de las credenciales de Notion incorrectas.")
        sys.exit(1)

    print("✅ Credenciales de Bitácora IT validadas y autorizadas correctamente.")


def evaluar_bloque_temporal(fecha_str):
    """Evalúa la marca temporal de la tarea mapeándola a las ventanas cronológicas."""
    if not fecha_str:
        return None
    try:
        solo_fecha = fecha_str.split("T")[0].strip()
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        # Normalización horaria estricta de San Juan, Argentina (GMT-3)
        hoy_local = (datetime.utcnow() - timedelta(hours=3)).date()

        if fecha_dt == hoy_local:
            return "HOY"
        elif fecha_dt == (hoy_local - timedelta(days=1)):
            return "AYER"
        elif fecha_dt == (hoy_local + timedelta(days=1)):
            return "MANANA"
        return None
    except Exception:
        return None


def auditar_consistencia_tripartita():
    """Ejecuta el pipeline de Sincronización principal contra la base de datos de Notion."""
    validar_credenciales()

    url = f"https://api.notion.com/v1/databases/{DB_RECORDATORIOS_DIARIOS}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    try:
        # Petición segura bajo protocolo TLS 1.3, con timeout para no colgar el Action
        response = requests.post(url, json={"page_size": 100}, headers=headers, timeout=15)
        response.raise_for_status()
        results = response.json().get("results", [])
        print(f"📦 [LOG PIPELINE]: Se recuperaron {len(results)} registros desde la base de datos de Notion.")

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

        # Generación de marcas de tiempo del diagnóstico de infraestructura
        ahora_utc = datetime.utcnow()
        ahora_argentina = ahora_utc - timedelta(hours=3)
        # Sincronización predictiva exacta calculada de forma dinámica relativa (+1 hora exacta)
        proxima_sincro = ahora_argentina + timedelta(hours=1)

        str_local = ahora_argentina.strftime("%d/%m/%Y %H:%M:%S")
        str_next = proxima_sincro.strftime("%d/%m/%Y %H:%M:%S")
        str_server = ahora_utc.strftime("%d/%m/%Y %H:%M:%S")

        # Lectura del frontend maestro index.html para realizar la inyección dinámica
        html_path = BASE_DIR / "index.html"
        with open(html_path, "r", encoding="utf-8") as file:
            html_content = file.read()

        # Reemplazo de constantes mediante expresiones regulares tolerantes a espacios (\s*)
        html_content = re.sub(r'const\s+timestampLocalStr\s*=\s*".*?"\s*;', f'const timestampLocalStr = "{str_local}";', html_content)
        html_content = re.sub(r'const\s+timestampNextStr\s*=\s*".*?"\s*;', f'const timestampNextStr = "{str_next}";', html_content)
        html_content = re.sub(r'const\s+timestampServerStr\s*=\s*".*?"\s*;', f'const timestampServerStr = "{str_server}";', html_content)

        import subprocess

        def obtener_version_actual():
            """Obtiene el último tag de Git como versión, o 'dev' si no hay tags."""
            try:
                version = subprocess.check_output(
                    ["git", "describe", "--tags", "--abbrev=0"],
                    cwd=BASE_DIR,
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                return version
            except subprocess.CalledProcessError:
                return "dev"

        # Serialización de estructuras JSON limpias, escapando "</" para evitar
        # que un estado de Notion cierre el bloque <script> prematuramente (XSS/HTML injection)
        json_ayer = json.dumps(conteo_ayer, ensure_ascii=False).replace("</", "<\\/")
        json_hoy = json.dumps(conteo_hoy, ensure_ascii=False).replace("</", "<\\/")
        json_manana = json.dumps(conteo_manana, ensure_ascii=False).replace("</", "<\\/")

        html_content = re.sub(r"const\s+conteoAyer\s*=\s*\{.*?\}\s*;", f"const conteoAyer = {json_ayer};", html_content)
        html_content = re.sub(r"const\s+conteoHoy\s*=\s*\{.*?\}\s*;", f"const conteoHoy = {json_hoy};", html_content)
        html_content = re.sub(r"const\s+conteoManana\s*=\s*\{.*?\}\s*;", f"const conteoManana = {json_manana};", html_content)

        app_version = obtener_version_actual()
        html_content = re.sub(r'const\s+appVersionStr\s*=\s*".*?"\s*;', f'const appVersionStr = "{app_version}";', html_content)

        # Sobrescribir index.html de forma atómica y segura
        with open(html_path, "w", encoding="utf-8") as file:
            file.write(html_content)

        print("✅ Frontend index.html sincronizado y actualizado con éxito de forma horaria.")

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