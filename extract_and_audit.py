# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión 4.0 - Inyección de Métricas Grandes)
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

if os.getenv("GITHUB_ACTIONS") != "true":
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID")

if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
    print("❌ Error: Faltan credenciales válidas en las variables de entorno.")
    sys.exit(1)

def ejecutar_auditoria():
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
        
        total_hoy = 0
        hechas_hoy = 0
        columna_estado = None
        columna_fecha = None
        
        if results:
            for n_col, info in results[0].get("properties", {}).items():
                if info.get("type") in ["status", "select"] and n_col.lower() in ["estado", "status"]: columna_estado = n_col
                if info.get("type") == "date": columna_fecha = n_col

        hoy_local = (datetime.utcnow() - timedelta(hours=3)).date()

        for pagina in results:
            props = pagina.get("properties", {})
            fecha_str = props.get(columna_fecha, {}).get("date", {}).get("start") if columna_fecha else None
            if not fecha_str: fecha_str = pagina.get("created_time")
            
            if fecha_str:
                solo_fecha = fecha_str.split("T")[0].strip()
                if datetime.strptime(solo_fecha, "%Y-%m-%d").date() == hoy_local:
                    total_hoy += 1
                    est_val = "Vacío"
                    if columna_estado:
                        st_data = props.get(columna_estado, {})
                        if st_data.get("type") == "status" and st_data.get("status"): est_val = st_data["status"].get("name")
                        elif st_data.get("type") == "select" and st_data.get("select"): est_val = st_data["select"].get("name")
                    
                    if est_val.lower() in ["hecha", "completada", "done"]:
                        hechas_hoy += 1

        tasa_constancia = (hechas_hoy / total_hoy * 100.0) if total_hoy > 0 else 100.0

        # Contador de peticiones
        contador_path = BASE_DIR / "peticiones_contador.txt"
        total_peticiones = 1
        if contador_path.exists():
            try:
                with open(contador_path, "r", encoding="utf-8") as cf: total_peticiones = int(cf.read().strip()) + 1
            except: pass
        with open(contador_path, "w", encoding="utf-8") as cf: cf.write(str(total_peticiones))

        # Tiempos
        ahora_utc = datetime.utcnow()
        ahora_argentina = ahora_utc - timedelta(hours=3)
        proxima_sincro = (ahora_argentina + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        
        str_local = ahora_argentina.strftime("%d/%m/%Y %H:%M:%S")
        str_next = proxima_sincro.strftime("%d/%m/%Y %H:%M:%S")
        str_server = ahora_utc.strftime("%d/%m/%Y %H:%M:%S")

        # Inyección exacta mediante Regex
        html_path = BASE_DIR / "index.html"
        with open(html_path, "r", encoding="utf-8") as file: html_content = file.read()
        
        html_content = re.sub(r'const\s+timestampLocalStr\s*=\s*".*?";', f'const timestampLocalStr = "{str_local}";', html_content)
        html_content = re.sub(r'const\s+timestampNextStr\s*=\s*".*?";', f'const timestampNextStr = "{str_next}";', html_content)
        html_content = re.sub(r'const\s+timestampServerStr\s*=\s*".*?";', f'const timestampServerStr = "{str_server}";', html_content)
        html_content = re.sub(r'const\s+totalPeticionesExitosas\s*=\s*\d+;', f'const totalPeticionesExitosas = {total_peticiones};', html_content)
        html_content = re.sub(r'const\s+tasaConstanciaHoy\s*=\s*[\d.]+;', f'const tasaConstanciaHoy = {tasa_constancia};', html_content)
        html_content = re.sub(r'const\s+tareasHechasHoy\s*=\s*\d+;', f'const tareasHechasHoy = {hechas_hoy};', html_content)
        html_content = re.sub(r'const\s+totalTareasHoy\s*=\s*\d+;', f'const totalTareasHoy = {total_hoy};', html_content)

        with open(html_path, "w", encoding="utf-8") as file: file.write(html_content)
        print(f"✅ Sincronización Realizada -> {tasa_constancia}%")

    except Exception as e:
        print(f"❌ Error en pipeline: {e}")

if __name__ == "__main__":
    ejecutar_auditoria()