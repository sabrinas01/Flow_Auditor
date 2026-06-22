# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión 3.5 - Monitoreo Técnico Persistente y Híbrido Cloud)
DESCRIPCIÓN: Extrae y audita la consistencia utilizando peticiones HTTP nativas.
             Sincroniza y escribe dinámicamente los bloques independientes de 
             Ayer, Hoy y Mañana en index.html, e inyecta métricas de control
             como la fecha/hora de sincronización y el contador de peticiones exitosas.
             Soporta ejecución híbrida: bucle local continuo o ejecución única en GitHub Actions.
AUTOR: Tu Mentor de Programación & Analista de Ciberseguridad
"""

import os
import sys
import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import requests

# 1. RESOLUCIÓN DE RUTA ABSOLUTA PARA EL ENTORNO
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"

def cargar_env_binario_robusto(ruta):
    """
    Lee el archivo .env de forma binaria cruda para saltarse las restricciones de codificación
    de Windows (UTF-16 LE, BOM, etc.) y limpia caracteres no imprimibles.
    """
    if not ruta.exists():
        return
    try:
        with open(ruta, "rb") as f:
            raw_data = f.read()
        
        if raw_data.startswith(b'\xff\xfe'):
            contenido = raw_data.decode('utf-16-le', errors='ignore')
        elif raw_data.startswith(b'\xfe\xff'):
            contenido = raw_data.decode('utf-16-be', errors='ignore')
        elif raw_data.startswith(b'\xef\xbb\xbf'):
            contenido = raw_data.decode('utf-8-sig', errors='ignore')
        else:
            if b'\x00' in raw_data and len(raw_data) % 2 == 0:
                try:
                    contenido = raw_data.decode('utf-16', errors='ignore')
                except Exception:
                    contenido = raw_data.decode('utf-8', errors='ignore')
            else:
                try:
                    contenido = raw_data.decode('utf-8')
                except UnicodeDecodeError:
                    contenido = raw_data.decode('latin-1', errors='ignore')
        
        contenido = contenido.replace('\x00', '')
        
        for linea in contenido.splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("#"):
                continue
            if "=" in linea:
                clave, valor = linea.split("=", 1)
                clave = ''.join(c for c in clave.strip() if c.isprintable())
                valor = valor.strip().strip('"').strip("'")
                os.environ[clave] = valor
    except Exception as e:
        print(f"⚠️ Error al decodificar manualmente el archivo .env: {e}")

# Ejecutamos nuestro extractor binario robusto diseñado para Windows (solo si no estamos en la nube)
if os.getenv("GITHUB_ACTIONS") != "true":
    cargar_env_binario_robusto(env_path)
    load_dotenv(dotenv_path=env_path)

# LÓGICA DE AUTENTICACIÓN HÍBRIDA (Soporta múltiples variantes de nombres para entornos locales y remotos)
NOTION_API_KEY = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS") or os.getenv("NOTION_DATABASE_ID")

INTERVALO_SEGUNDOS = 10800  # 3 Horas

if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
    print("❌ [ERROR]: Faltan credenciales válidas en tu archivo .env o variables de entorno de GitHub.")
    print(f"🔍 Directorio de búsqueda absoluto del .env:\n   👉 '{env_path}'")
    print(f"DEBUG - API Key detectada: {bool(NOTION_API_KEY)} | DB ID detectada: {bool(DB_RECORDATORIOS_DIARIOS)}")
    sys.exit(1)

def evaluar_bloque_temporal(fecha_str):
    """
    Normaliza estrictamente la fecha YYYY-MM-DD para neutralizar desfases 
    de zonas horarias UTC introducidas por la API de Notion en tránsito.
    """
    if not fecha_str:
        return None
    try:
        solo_fecha = fecha_str.split("T")[0].strip()
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        
        hoy = datetime.now().date()
        ayer = hoy - timedelta(days=1)
        manana = hoy + timedelta(days=1)
        
        if fecha_dt == hoy:
            return "HOY"
        elif fecha_dt == ayer:
            return "AYER"
        elif fecha_dt == manana:
            return "MANANA"
        return None
    except Exception as e:
        print(f"⚠️ Error al evaluar ventana temporal para la fecha ({fecha_str}): {e}")
        return None

def auditar_consistencia_tripartita():
    print(f"\n🔄 [{datetime.now().strftime('%H:%M:%S')}] Iniciando extracción desde Notion para index.html...")
    
    url = f"https://api.notion.com/v1/databases/{DB_RECORDATORIOS_DIARIOS}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    data = {
        "page_size": 100
    }
    
    try:
        with requests.Session() as session:
            session.headers.update(headers)
            response = session.post(url, json=data)
            response.raise_for_status()
            results = response.json().get("results", [])
            
        if not results:
            print("⚠️  [AUDITORÍA]: Base de datos vacía.")
            return

        print(f"📊 Se extrajeron {len(results)} registros totales de Notion.")
        
        conteo_ayer = {}
        conteo_hoy = {}
        conteo_manana = {}
        
        tareas_consistentes_hoy = 0
        total_tareas_hoy = 0
        
        columna_estado = None
        columna_fecha = None
        columna_consistencia = None
        
        primer_registro = results[0].get("properties", {})
        for nombre_columna, info_columna in primer_registro.items():
            tipo = info_columna.get("type")
            nombre_lower = nombre_columna.lower()
            
            if tipo in ["status", "select"]:
                if nombre_lower in ["estado", "status"]: columna_estado = nombre_columna
                elif ("estado" in nombre_lower or "status" in nombre_lower) and (columna_estado is None or columna_estado.lower() not in ["estado", "status"]):
                    columna_estado = nombre_columna
                elif columna_estado is None and "prioridad" not in nombre_lower and "priority" not in nombre_lower:
                    columna_estado = nombre_columna
            elif tipo == "date":
                columna_fecha = nombre_columna
            
            if "consistencia" in nombre_lower:
                columna_consistencia = nombre_columna

        for pagina in results:
            props = pagina.get("properties", {})
            fecha_pagina = None
            
            if columna_fecha:
                date_data = props.get(col