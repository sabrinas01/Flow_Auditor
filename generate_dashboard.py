#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MÓDULO: generate_dashboard.py (Versión 3.3 - Arquitectura Desacoplada y DRY)
DESCRIPCIÓN: Consume datos reales de la API de Notion, lee el archivo index.html como
             plantilla maestra, inyecta dinámicamente las métricas de consistencia
             e infraestructura por medio de expresiones regulares y compila el archivo
             dashboard.html local. Se eliminó la inyección y el contador de peticiones.
AUTOR: Tu Mentor de Programación y Ciberseguridad (IT Functional Analyst Sabrina)
"""

import os
import sys
import json
import re
import datetime
from pathlib import Path
from dotenv import load_dotenv
import requests

# =====================================================================
# 1. ENTORNO SEGURO Y CONFIGURACIÓN (.ENV WINDOWS)
# =====================================================================
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)

NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID") or os.getenv("NOTION_DB_ID")

def validar_credenciales():
    """Garantiza que las credenciales locales sean válidas antes de realizar llamadas."""
    if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
        sys.stderr.write("❌ [ERROR CRÍTICO]: Faltan credenciales en tu archivo .env local.\n")
        sys.exit(1)
        
    if "${{" in NOTION_API_KEY or "}}" in NOTION_API_KEY:
        sys.stderr.write("❌ [ERROR CRÍTICO]: El token contiene marcas de secretos de GitHub sin resolver.\n")
        sys.exit(1)
        
    if len(NOTION_API_KEY) < 20 or len(DB_RECORDATORIOS_DIARIOS) < 32:
        sys.stderr.write("❌ [ERROR CRÍTICO]: Las credenciales locales parecen estar incompletas o corruptas.\n")
        sys.exit(1)
        
    print("✅ Credenciales de Bitácora IT validadas correctamente.")

# =====================================================================
# 2. PROCESAMIENTO HORARIO (GMT-3 SAN JUAN, ARGENTINA)
# =====================================================================
utc_now = datetime.datetime.utcnow()
gmt3_offset = datetime.timedelta(hours=3)
arg_now = utc_now - gmt3_offset

fecha_hoy = arg_now.date()
fecha_ayer = fecha_hoy - datetime.timedelta(days=1)
fecha_manana = fecha_hoy + datetime.timedelta(days=1)

timestamp_local_argentina = arg_now.strftime("%d/%m/%Y %H:%M:%S")
timestamp_server_utc = utc_now.strftime("%d/%m/%Y %H:%M:%S")

# Sincronización local ajustada estrictamente a 1 hora (60 minutos) para la v3.3
proxima_sincro_arg = (arg_now + datetime.timedelta(hours=1)).strftime("%d/%m/%Y %H:%M:%S")

# =====================================================================
# 3. EXTRACCIÓN DE DADOS DESDE NOTION (SEGURO)
# =====================================================================
def extraer_datos_reales():
    """Conecta de forma segura a Notion y extrae el set cronológico de tareas."""
    validar_credenciales()
    
    url = f"https://api.notion.com/v1/databases/{DB_RECORDATORIOS_DIARIOS}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    # Filtro dinámico simplificado para limitar peticiones de red y latencia
    query_payload = {
        "filter": {
            "and": [
                {
                    "property": "Fecha",
                    "date": {
                        "on_or_after": fecha_ayer.isoformat()
                    }
                },
                {
                    "property": "Fecha",
                    "date": {
                        "on_or_before": fecha_manana.isoformat()
                    }
                }
            ]
        }
    }
    
    try:
        with requests.Session() as session:
            response = session.post(url, headers=headers, json=query_payload, timeout=15)
            response.raise_for_status()
            results = response.json().get("results", [])
            print(f"📦 [CONEXIÓN EXITOSA]: API de Notion devolvió {len(results)} registros.")
            return results
    except Exception as e:
        sys.stderr.write(f"❌ Error al consultar la API de Notion: {e}\n")
        sys.exit(1)

# =====================================================================
# 4. PARSER Y NORMALIZACIÓN DE ESTADOS
# =====================================================================
def normalizar_datos(paginas):
    """Mapea y clasifica los registros en bloques temporales respetando el SRS v3.3."""
    conteo_ayer = {}
    conteo_hoy = {}
    conteo_manana = {}
    
    columna_estado = None
    columna_fecha = None
    
    # Detección dinámica de esquema de columnas
    if paginas:
        for n_col, info in paginas[0].get("properties", {}).items():
            if info.get("type") in ["status", "select"] and n_col.lower() in ["estado", "status"]: 
                columna_estado = n_col
            if info.get("type") == "date": 
                columna_fecha = n_col

    for pagina in paginas:
        props = pagina.get("properties", {})
        
        # Extraer Fecha
        fecha_p = props.get(columna_fecha, {}).get("date", {}).get("start") if columna_fecha else None
        if not fecha_p: 
            fecha_p = pagina.get("created_time")
        if not fecha_p:
            continue
            
        task_date_str = fecha_p.split("T")[0].strip()
        
        # Extraer Estado de manera tolerante (Se reemplaza el tag de selección)
        estado = "Sin empezar"
        if columna_estado:
            st_data = props.get(columna_estado, {})
            stype = st_data.get("type")
            if stype == "status" and st_data.get("status"): 
                estado = st_data["status"].get("name", "Sin empezar")
            elif stype == "select" and st_data.get("select"):
                estado = st_data["select"].get("name", "Sin empezar")

        # Clasificar en los contenedores agrupados
        if task_date_str == fecha_ayer.isoformat():
            conteo_ayer[estado] = conteo_ayer.get(estado, 0) + 1
        elif task_date_str == fecha_hoy.isoformat():
            conteo_hoy[estado] = conteo_hoy.get(estado, 0) + 1
        elif task_date_str == fecha_manana.isoformat():
            conteo_manana[estado] = conteo_manana.get(estado, 0) + 1
            
    return conteo_ayer, conteo_hoy, conteo_manana

# =====================================================================
# 5. COMPILACIÓN DE INTERFAZ LOCAL (MANUAL DE MARCA POMELLI)
# =====================================================================
def construir_interfaz_html(conteo_ayer, conteo_hoy, conteo_manana, total_raw):
    """Lee el index.html como plantilla maestra y compila el dashboard.html local."""
    
    html_template_path = BASE_DIR / "index.html"
    if not html_template_path.exists():
        sys.stderr.write("❌ [ERROR CRÍTICO]: El archivo index.html no fue encontrado para ser usado como plantilla.\n")
        sys.exit(1)
        
    with open(html_template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # Convertir las estructuras a cadenas JSON limpias
    json_ayer = json.dumps(conteo_ayer, ensure_ascii=False)
    json_hoy = json.dumps(conteo_hoy, ensure_ascii=False)
    json_manana = json.dumps(conteo_manana, ensure_ascii=False)
    
    # Expresiones Regulares oñandúva variables JS y las actualiza (Español limpio)
    reemplazos = [
        (r'const\s+timestampLocalStr\s*=\s*".*?"\s*;', f'const timestampLocalStr = "{timestamp_local_argentina}";'),
        (r'const\s+timestampNextStr\s*=\s*".*?"\s*;', f'const timestampNextStr = "{proxima_sincro_arg}";'),
        (r'const\s+timestampServerStr\s*=\s*".*?"\s*;', f'const timestampServerStr = "{timestamp_server_utc}";'),
        (r'const\s+conteoAyer\s*=\s*\{.*?\}\s*;', f'const conteoAyer = {json_ayer};'),
        (r'const\s+conteoHoy\s*=\s*\{.*?\}\s*;', f'const conteoHoy = {json_hoy};'),
        (r'const\s+conteoManana\s*=\s*\{.*?\}\s*;', f'const conteoManana = {json_manana};')
    ]

    for pattern, replacement in reemplazos:
        html_content = re.sub(pattern, replacement, html_content)

    # Grabado del archivo de salida compilado localmente
    output_html_path = BASE_DIR / "dashboard.html"
    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print("\n🖥️  [DASHBOARD LOCAL GENERADO CON ÉXITO]")
    print("👉 El script leyó el archivo maestro 'index.html' y compiló 'dashboard.html' sin duplicar código.")
    print("👉 Abre 'dashboard.html' directamente en tu navegador para visualizar las métricas locales reales.")

# =====================================================================
# 6. ORQUESTADOR DE EJECUCIÓN (PIPELINE)
# =====================================================================
def ejecutar_pipeline():
    print("🚀 Sincronizando y compilando Dashboard Local (v3.3)...")
    paginas = extraer_datos_reales()
    
    if not paginas:
        print("⚠️ No se encontraron registros para compilar en Notion.")
        return
        
    conteo_ayer, conteo_hoy, conteo_manana = normalizar_datos(paginas)
    construir_interfaz_html(conteo_ayer, conteo_hoy, conteo_manana, len(paginas))

if __name__ == "__main__":
    ejecutar_pipeline()