# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión 5.3 - Validación Robusta de Credenciales)
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

if os.getenv("GITHUB_ACTIONS") != "true" and env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Validación mejorada: Intenta múltiples nombres de variables y verifica que no sean literales
NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID") or os.getenv("NOTION_DB_ID")

# Validación crítica: Detecta si las variables contienen valores literales de secretos sin resolver
def validar_credenciales():
    """Valida que las credenciales sean válidas y no contengan marcas de secretos sin resolver."""
    
    if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
        print("❌ [ERROR CRÍTICO]: Faltan credenciales válidas en las variables de entorno.")
        sys.exit(1)
    
    # Detectar patrones de secretos sin resolver (por ejemplo: ${{ secrets.xxx }})
    if "${{" in NOTION_API_KEY or "}}" in NOTION_API_KEY:
        print("❌ [ERROR CRÍTICO]: NOTION_API_KEY contiene marcas de secreto sin resolver.")
        print(f"   Valor detectado: {NOTION_API_KEY[:50]}...")
        print("   Verifica que el secreto 'NOTION_API_KEY' esté configurado en GitHub Settings > Secrets.")
        sys.exit(1)
    
    if "${{" in DB_RECORDATORIOS_DIARIOS or "}}" in DB_RECORDATORIOS_DIARIOS:
        print("❌ [ERROR CRÍTICO]: NOTION_DB_RECORDATORIOS_DIARIOS contiene marcas de secreto sin resolver.")
        print(f"   Valor detectado: {DB_RECORDATORIOS_DIARIOS[:50]}...")
        print("   Verifica que el secreto 'NOTION_DB_RECORDATORIOS_DIARIOS' esté configurado en GitHub Settings > Secrets.")
        sys.exit(1)
    
    # Validar longitudes mínimas razonables
    if len(NOTION_API_KEY) < 20:
        print("❌ [ERROR CRÍTICO]: NOTION_API_KEY parece inválida (demasiado corta).")
        sys.exit(1)
    
    if len(DB_RECORDATORIOS_DIARIOS) < 32:
        print("❌ [ERROR CRÍTICO]: NOTION_DB_RECORDATORIOS_DIARIOS parece inválida (demasiado corta).")
        sys.exit(1)
    
    print("✅ Credenciales validadas correctamente.")

def evaluar_bloque_temporal(fecha_str):
    if not fecha_str: return None
    try:
        solo_fecha = fecha_str.split("T")[0].strip()
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        hoy_local = (datetime.utcnow() - timedelta(hours=3)).date()
        if fecha_dt == hoy_local: return "HOY"
        elif fecha_dt == (hoy_local - timedelta(days=1)): return "AYER"
        elif fecha_dt == (hoy_local + timedelta(days=1)): return "MANANA"
        return None
    except:
        return None

def auditar_consistencia_tripartita():
    # Validar credenciales antes de hacer cualquier solicitud
    validar_credenciales()
    
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
        print(f"📦 [LOG CLOUD]: La API de Notion devolvió {len(results)} registros totales.")
        
        conteo_ayer, conteo_hoy, conteo_manana = {}, {}, {}
        columna_estado, columna_fecha = None, None
        
        if results:
            for n_col, info in results[0].get("properties", {}).items():
                if info.get("type") in ["status", "select"] and n_col.lower() in ["estado", "status"]: columna_estado = n_col
                if info.get("type") == "date": columna_fecha = n_col

        for pagina in results:
            props = pagina.get("properties", {})
            fecha_p = props.get(columna_fecha, {}).get("date", {}).get("start") if columna_fecha else None
            if not fecha_p: fecha_p = pagina.get("created_time")
            
            bloque = evaluar_bloque_temporal(fecha_p)
            if not bloque: continue
            
            est_val = "Sin empezar"
            if columna_estado:
                st_data = props.get(columna_estado, {})
                if st_data.get("type") == "status" and st_data.get("status"): est_val = st_data["status"].get("name")
                elif st_data.get("type") == "select" and st_data.get("select"): est_val = st_data["select"].get("name")
            
            if bloque == "AYER":
                conteo_ayer[est_val] = conteo_ayer.get(est_val, 0) + 1
            elif bloque == "HOY":
                conteo_hoy[est_val] = conteo_hoy.get(est_val, 0) + 1
            elif bloque == "MANANA":
                conteo_manana[est_val] = conteo_manana.get(est_val, 0) + 1

        # Contador persistente de peticiones exitosas
        contador_path = BASE_DIR / "peticiones_contador.txt"
        total_peticiones = 1
        if contador_path.exists():
            try:
                with open(contador_path, "r", encoding="utf-8") as cf: total_peticiones = int(cf.read().strip()) + 1
            except: pass
        with open(contador_path, "w", encoding="utf-8") as cf: cf.write(str(total_peticiones))

        # Alineación de husos horarios (Argentina UTC-3)
        ahora_utc = datetime.utcnow()
        ahora_argentina = ahora_utc - timedelta(hours=3)
        proxima_sincro = (ahora_argentina + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        
        str_local = ahora_argentina.strftime("%d/%m/%Y %H:%M:%S")
        str_next = proxima_sincro.strftime("%d/%m/%Y %H:%M:%S")
        str_server = ahora_utc.strftime("%d/%m/%Y %H:%M:%S")

        # Lectura e Inyección avanzada mediante Expresiones Regulares Flexibles
        html_path = BASE_DIR / "index.html"
        with open(html_path, "r", encoding="utf-8") as file: html_content = file.read()
        
        # Parche de Flexibilidad Absoluta para marcas de tiempo e indicadores numéricos
        html_content = re.sub(r'const\s+timestampLocalStr\s*=\s*".*?"\s*;', f'const timestampLocalStr = "{str_local}";', html_content)
        html_content = re.sub(r'const\s+timestampNextStr\s*=\s*".*?"\s*;', f'const timestampNextStr = "{str_next}";', html_content)
        html_content = re.sub(r'const\s+timestampServerStr\s*=\s*".*?"\s*;', f'const timestampServerStr = "{str_server}";', html_content)
        html_content = re.sub(r'const\s+totalPeticionesExitosas\s*=\s*\d+\s*;', f'const totalPeticionesExitosas = {total_peticiones};', html_content)
        
        # Inyección de Estructuras JSON para procesamiento dinámico del lado del Cliente
        html_content = re.sub(r"const\s+conteoAyer\s*=\s*\{.*?\}\s*;", f"const conteoAyer = {json.dumps(conteo_ayer, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoHoy\s*=\s*\{.*?\}\s*;", f"const conteoHoy = {json.dumps(conteo_hoy, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoManana\s*=\s*\{.*?\}\s*;", f"const conteoManana = {json.dumps(conteo_manana, ensure_ascii=False)};", html_content)

        with open(html_path, "w", encoding="utf-8") as file: file.write(html_content)
        print("✅ index.html sincronizado y actualizado de forma robusta.")

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("❌ [ERROR CRÍTICO EN PIPELINE]: 401 Unauthorized - Verifica que los secretos sean válidos.")
            print("   - NOTION_API_KEY debe ser un token válido de Notion")
            print("   - NOTION_DB_RECORDATORIOS_DIARIOS debe ser el ID válido de la base de datos")
        else:
            print(f"❌ [ERROR CRÍTICO EN PIPELINE]: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ [ERROR CRÍTICO EN PIPELINE]: {e}")
        sys.exit(1)

if __name__ == "__main__":
    auditar_consistencia_tripartita()
