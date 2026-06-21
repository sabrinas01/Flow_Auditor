# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión 3.3 - Monitoreo Técnico Persistente y Híbrido Cloud)
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

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS")

INTERVALO_SEGUNDOS = 10800  # 3 Horas

if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
    print("❌ [ERROR]: Faltan credenciales válidas en tu archivo .env o variables de entorno de GitHub.")
    print(f"🔍 Directorio de búsqueda absoluto del .env:\n   👉 '{env_path}'")
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
                date_data = props.get(columna_fecha, {}) or {}
                if date_data.get("type") == "date":
                    date_inner = date_data.get("date") or {}
                    fecha_pagina = date_inner.get("start")
            
            if not fecha_pagina:
                fecha_pagina = pagina.get("created_time")
                
            bloque = evaluar_bloque_temporal(fecha_pagina)
            if not bloque:
                continue
                
            estado_val = "Vacío"
            if columna_estado:
                status_data = props.get(columna_estado, {})
                tipo_status = status_data.get("type")
                if tipo_status == "status" and status_data.get("status"):
                    estado_val = status_data["status"].get("name")
                elif tipo_status == "select" and status_data.get("select"):
                    estado_val = status_data["select"].get("name")
            
            if bloque == "AYER":
                conteo_ayer[estado_val] = conteo_ayer.get(estado_val, 0) + 1
            elif bloque == "MANANA":
                conteo_manana[estado_val] = conteo_manana.get(estado_val, 0) + 1
            elif bloque == "HOY":
                conteo_hoy[estado_val] = conteo_hoy.get(estado_val, 0) + 1
                total_tareas_hoy += 1
                
                val_consistencia = 0
                if columna_consistencia:
                    cons_data = props.get(columna_consistencia, {})
                    tipo_cons = cons_data.get("type")
                    if tipo_cons == "number":
                        val_consistencia = cons_data.get("number", 0)
                    elif tipo_cons == "formula":
                        f_data = cons_data.get("formula", {})
                        if f_data.get("type") == "number": val_consistencia = f_data.get("number", 0)
                        elif f_data.get("type") == "boolean": val_consistencia = 1 if f_data.get("boolean") else 0
                    elif tipo_cons == "checkbox":
                        val_consistencia = 1 if cons_data.get("checkbox") else 0

                if estado_val == "Hecha" and float(val_consistencia) == 1.0:
                    tareas_consistentes_hoy += 1

        print(f"📅 Distribución temporal exacta -> Ayer: {sum(conteo_ayer.values())} | Hoy: {total_tareas_hoy} | Mañana: {sum(conteo_manana.values())}")

        # ----------------------------------------------------------------
        # 📈 SISTEMA DE PERSISTENCIA PARA EL CONTADOR DE PETICIONES
        # ----------------------------------------------------------------
        contador_path = BASE_DIR / "peticiones_contador.txt"
        total_peticiones = 1
        
        if contador_path.exists():
            try:
                with open(contador_path, "r", encoding="utf-8") as c_file:
                    total_peticiones = int(c_file.read().strip()) + 1
            except Exception:
                pass
                
        with open(contador_path, "w", encoding="utf-8") as c_file:
            c_file.write(str(total_peticiones))

        # ----------------------------------------------------------------
        # 🛡️ INYECCIÓN EN EL INDEX.HTML CON METADATOS TÉCNICOS
        # ----------------------------------------------------------------
        html_path = BASE_DIR / "index.html"
        if not html_path.exists():
            print(f"❌ [ERROR]: No se encontró el archivo '{html_path}'")
            return
            
        with open(html_path, "r", encoding="utf-8") as file:
            html_content = file.read()
            
        import re
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        # Inyección de Métricas Técnicas
        html_content = re.sub(r'const\s+ultimaActualizacionStr\s*=\s*".*?";', f'const ultimaActualizacionStr = "{now_str}";', html_content)
        html_content = re.sub(r'const\s+totalPeticionesExitosas\s*=\s*\d+;', f'const totalPeticionesExitosas = {total_peticiones};', html_content)
        
        # Inyección de Datos de Notion
        html_content = re.sub(r"const\s+diasReales\s*=\s*\d+;", f"const diasReales = {tareas_consistentes_hoy};", html_content)
        html_content = re.sub(r"totalDias\s*=\s*\d+;", f"totalDias = {total_tareas_hoy};", html_content)
        html_content = re.sub(r"const\s+conteoAyer\s*=\s*\{.*?\};", f"const conteoAyer = {json.dumps(conteo_ayer, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoHoy\s*=\s*\{.*?\};", f"const conteoHoy = {json.dumps(conteo_hoy, ensure_ascii=False)};", html_content)
        html_content = re.sub(r"const\s+conteoManana\s*=\s*\{.*?\};", f"const conteoManana = {json.dumps(conteo_manana, ensure_ascii=False)};", html_content)

        with open(html_path, "w", encoding="utf-8") as file:
            file.write(html_content)
        print(f"✅ [CONTROL TÉCNICO INYECTADO]: Sincro: {now_str} | Peticiones Totales: {total_peticiones}")

        # ----------------------------------------------------------------
        # 🚀 AUTOMATIZACIÓN DE GIT TOLERANTE A ONEDRIVE (SÓLO SI ES LOCAL)
        # ----------------------------------------------------------------
        if os.getenv("GITHUB_ACTIONS") != "true":
            print("📤 Sincronizando con GitHub Pages...")
            try:
                time.sleep(1)
                os.system("git add index.html peticiones_contador.txt")
                time.sleep(1)
                commit_msg = f'git commit -m "update: sincro {now_str} | peticiones: {total_peticiones}"'
                os.system(commit_msg)
                time.sleep(1)
                os.system("git push origin main_fa")
                print("🎉 [PIPELINE EXITOSO]: Actualización enviada con éxito a tu celular.")
            except Exception as git_err:
                print(f"⚠️ Alerta en Git: {git_err}")
        else:
            print("⚙️ Ejecutándose en GitHub Actions. La actualización del archivo e historial de commits se gestiona mediante el pipeline nativo.")

    except Exception as e:
        print(f"❌ Error crítico durante el pipeline de auditoría: {e}")

if __name__ == "__main__":
    # Si estamos en la nube, se ejecuta UNA VEZ y el workflow de GitHub se encarga de apagar el contenedor
    if os.getenv("GITHUB_ACTIONS") == "true":
        print("☁️ [ENTORNO CI/CD DETECTADO]: Ejecutando ciclo único para GitHub Actions.")
        auditar_consistencia_tripartita()
        sys.exit(0)
        
    # Si estamos en local, corre el bucle continuo tradicional de fondo
    print("================================================================")
    print("🛡️  NOTION FLOW AUDITOR - PIPELINE TRÍPTICO MÓVIL V3.3")
    print(f"⏰ Actualización automatizada activa cada {INTERVALO_SEGUNDOS} segundos.")
    print("================================================================")
    
    while True:
        try:
            auditar_consistencia_tripartita()
            print(f"💤 Esperando {INTERVALO_SEGUNDOS} segundos para el próximo ciclo...")
            time.sleep(INTERVALO_SEGUNDOS)
        except KeyboardInterrupt:
            print("\n🛑 [SERVICIO DETENIDO]: Finalizando de forma limpia...")
            break
        except Exception as e:
            print(f"\n❌ Error en el bucle principal: {e}")
            time.sleep(10)