# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión 3.9 - Estética Restaurada Estricta)
"""

import os
import sys
import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import requests

BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"

def cargar_env_binario_robusto(ruta):
    if not ruta.exists(): return
    try:
        with open(ruta, "rb") as f: raw_data = f.read()
        if raw_data.startswith(b'\xff\xfe'): contenido = raw_data.decode('utf-16-le', errors='ignore')
        elif raw_data.startswith(b'\xfe\xff'): contenido = raw_data.decode('utf-16-be', errors='ignore')
        elif raw_data.startswith(b'\xef\xbb\xbf'): contenido = raw_data.decode('utf-8-sig', errors='ignore')
        else: contenido = raw_data.decode('utf-8', errors='ignore') if b'\x00' in raw_data else raw_data.decode('utf-8')
        contenido = contenido.replace('\x00', '')
        for linea in contenido.splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("#"): continue
            if "=" in linea:
                clave, valor = linea.split("=", 1)
                os.environ[clave.strip()] = valor.strip().strip('"').strip("'")
    except Exception as e: print(f"⚠️ Error al decodificar .env: {e}")

if os.getenv("GITHUB_ACTIONS") != "true":
    cargar_env_binario_robusto(env_path)
    load_dotenv(dotenv_path=env_path)

NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID")

if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
    print("❌ [ERROR]: Faltan credenciales válidas.")
    sys.exit(1)

def evaluar_bloque_temporal(fecha_str):
    if not fecha_str: return None
    try:
        solo_fecha = fecha_str.split("T")[0].strip()
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        hoy_local = (datetime.utcnow() - timedelta(hours=3)).date()
        ayer = hoy_local - timedelta(days=1)
        manana = hoy_local + timedelta(days=1)
        
        if fecha_dt == hoy_local: return "HOY"
        elif fecha_dt == ayer: return "AYER"
        elif fecha_dt == manana: return "MANANA"
        return None
    except Exception: return None

def auditar_consistencia_tripartita():
    url = f"https://api.notion.com/v1/databases/{DB_RECORDATORIOS_DIARIOS}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json={"page_size": 100}, headers=headers)
        response.raise_for_status()
        results = response.json().get("results", [])
        
        conteo_ayer, conteo_hoy, conteo_manana = {}, {}, {}
        total_tareas_hoy = 0
        columna_estado, columna_fecha = None, None
        
        if results:
            for n_col, info in results[0].get("properties", {}).items():
                if info.get("type") in ["status", "select"] and n_col.lower() in ["estado", "status"]: columna_estado = n_col
                if info.get("type") == "date": columna_fecha = n_col
            if not columna_estado and results[0].get("properties"):
                columna_estado = list(results[0].get("properties").keys())[0]

        for pagina in results:
            props = pagina.get("properties", {})
            fecha_p = props.get(columna_fecha, {}).get("date", {}).get("start") if columna_fecha else None
            if not fecha_p: fecha_p = pagina.get("created_time")
            
            bloque = evaluar_bloque_temporal(fecha_p)
            if not bloque: continue
            
            est_val = "Vacío"
            if columna_estado:
                st_data = props.get(columna_estado, {})
                if st_data.get("type") == "status" and st_data.get("status"): est_val = st_data["status"].get("name")
                elif st_data.get("type") == "select" and st_data.get("select"): est_val = st_data["select"].get("name")
            
            if bloque == "AYER": conteo_ayer[est_val] = conteo_ayer.get(est_val, 0) + 1
            elif bloque == "MANANA": conteo_manana[est_val] = conteo_manana.get(est_val, 0) + 1
            elif bloque == "HOY":
                conteo_hoy[est_val] = conteo_hoy.get(est_val, 0) + 1
                total_tareas_hoy += 1

        # CONTADOR DE PETICIONES
        contador_path = BASE_DIR / "peticiones_contador.txt"
        total_peticiones = 1
        if contador_path.exists():
            try:
                with open(contador_path, "r", encoding="utf-8") as cf: total_peticiones = int(cf.read().strip()) + 1
            except: pass
        with open(contador_path, "w", encoding="utf-8") as cf: cf.write(str(total_peticiones))

        # CÁLCULO DE HUSOS HORARIOS Y COMPUTE DE PRÓXIMA ACCIÓN (CRON DE 1 HORA)
        ahora_utc = datetime.utcnow()
        ahora_argentina = ahora_utc - timedelta(hours=3)
        proxima_sincro_arg = (ahora_argentina + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        
        str_local = ahora_argentina.strftime("%d/%m/%Y %H:%M:%S")
        str_next = proxima_sincro_arg.strftime("%d/%m/%Y %H:%M:%S")
        str_server = ahora_utc.strftime("%d/%m/%Y %H:%M:%S")

        # INYECCIÓN EN HTML
        html_path = BASE_DIR / "index.html"
        with open(html_path, "r", encoding="utf-8") as file: html_content = file.read()
        
        import re
        html_content = re.sub(r'const\s+timestampLocalStr\s*=\s*".*?";', f'const timestampLocalStr = "{str_local}";', html_content)
        html_content = re.sub(r'const\s+timestampNextStr\s*=\s*".*?";', f'const timestampNextStr = "{str_next}";', html_content)
        html_content = re.sub(r'const\s+timestampServerStr\s*=\s*".*?";', f'const timestampServerStr = "{str_server}";', html_content)
        html_content = re.sub(r'const\s+totalPeticionesExitosas\s*=\s*\d+;', f'const totalPeticionesExitosas = {total_peticiones};', html_content)
        html_content = re.sub(r"totalDias\s*=\s*\d+;", f"totalDias = {total_tareas_hoy};", html_content)
        html_content = re.sub(r"const\s+totalAyer\s*=\s*\d+;", f"const totalAyer = {sum(conteo_ayer.values())};", html_content)
        html_content = re.sub(r"const\s+totalManana\s*=\s*\d+;", f"const totalManana = {sum(conteo_manana.values())};", html_content)
        html_content = re.sub(r"const\s+conteoAyer\s*=\s*\{.*?\};", f"const conteoAyer = {json.dumps(conteo_ayer, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoHoy\s*=\s*\{.*?\};", f"const conteoHoy = {json.dumps(conteo_hoy, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoManana\s*=\s*\{.*?\};", f"const conteoManana = {json.dumps(conteo_manana, ensure_ascii=False)};", html_content)

        with open(html_path, "w", encoding="utf-8") as file: file.write(html_content)
        print(f"✅ Sincro Realizada -> ART: {str_local}")

    except Exception as e:
        print(f"❌ Error en pipeline: {e}")

if __name__ == "__main__":
    auditar_consistencia_tripartita()