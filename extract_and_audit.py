# -*- coding: utf-8 -*-
"""
MÓDULO: extract_and_audit.py (Versión de Producción en Español - Enfoque Diario)
DESCRIPCIÓN: Extrae y audita la consistencia diaria utilizando peticiones HTTP nativas.
             Implementa un administrador de sesiones para garantizar que las conexiones
             de red se cierren herméticamente tras cada ciclo. Se ejecuta en un bucle continuo.
             Resuelve las rutas de .env de forma absoluta y cuenta con un decodificador inteligente
             para solucionar problemas de formato de archivos creados en Windows/PowerShell.
             Sincroniza y escribe dinámicamente tanto las tareas diarias como el desglose de estados en dashboard.html.
AUTOR: Tu Mentor de Programación & Analista de Ciberseguridad
"""

import os
import sys
import time
import json  # Requerido para formatear de forma segura el conteo de estados para JS
from datetime import datetime
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
        
        # Detectar la codificación de forma binaria estricta
        if raw_data.startswith(b'\xff\xfe'):
            contenido = raw_data.decode('utf-16-le', errors='ignore')
        elif raw_data.startswith(b'\xfe\xff'):
            contenido = raw_data.decode('utf-16-be', errors='ignore')
        elif raw_data.startswith(b'\xef\xbb\xbf'):
            contenido = raw_data.decode('utf-8-sig', errors='ignore')
        else:
            # Si hay bytes nulos alternados, probablemente sea UTF-16 sin BOM explícito
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
        
        # Limpiar caracteres nulos y normalizar saltos de línea
        contenido = contenido.replace('\x00', '')
        
        for linea in contenido.splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("#"):
                continue
            if "=" in linea:
                clave, valor = linea.split("=", 1)
                # Remover caracteres no imprimibles u ocultos de la clave (como BOMs colados)
                clave = ''.join(c for c in clave.strip() if c.isprintable())
                valor = valor.strip().strip('"').strip("'")
                os.environ[clave] = valor
    except Exception as e:
        print(f"⚠️ Error al decodificar manualmente el archivo .env: {e}")

# Ejecutamos primero nuestro extractor binario robusto diseñado para Windows
cargar_env_binario_robusto(env_path)

# Cargamos dotenv como respaldo secundario para variables estándar
load_dotenv(dotenv_path=env_path)

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
DB_RECORDATORIOS_DIARIOS = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS")

# Configuración del bucle de fondo (3 horas = 10800 segundos)
INTERVALO_SEGUNDOS = 10800

if not NOTION_API_KEY or not DB_RECORDATORIOS_DIARIOS:
    print("❌ [ERROR]: Faltan credenciales válidas en tu archivo .env")
    print(f"🔍 Directorio de búsqueda absoluto del .env:\n   👉 '{env_path}'")
    
    # --- DIAGNÓSTICO SEGURO DE VARIABLES DETECTADAS EN TU .ENV ---
    print("\n🔑 [DIAGNÓSTICO SEGURO DE CLAVES EN .ENV]:")
    try:
        if env_path.exists():
            with open(env_path, "rb") as f:
                raw = f.read()
            if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
                text = raw.decode('utf-16', errors='ignore').replace('\x00', '')
            else:
                text = raw.decode('utf-8', errors='ignore').replace('\x00', '')
            
            claves_encontradas = []
            for l in text.splitlines():
                l = l.strip()
                if l and '=' in l and not l.startswith('#'):
                    claves_encontradas.append(l.split('=', 1)[0].strip())
            
            if claves_encontradas:
                print("   Python detectó que escribiste estas variables en tu archivo:")
                for c in claves_encontradas:
                    # Limpiamos caracteres no imprimibles para el print de diagnóstico
                    c_limpia = ''.join(char for char in c if char.isprintable())
                    print(f"   • Variable: '{c_limpia}'")
                print("\n💡 NOTA: Tu script de Python espera exactamente 'NOTION_API_KEY' y 'NOTION_DB_HABITS'.")
                print("Si tienen un nombre ligeramente diferente o espacios adicionales, el script no podrá leerlas.")
            else:
                print("   ⚠️ El archivo .env parece estar vacío o no tiene el formato 'CLAVE=VALOR'.")
        else:
            print("   ❌ El archivo .env no es accesible o no existe en la ruta de búsqueda.")
    except Exception as e:
        print(f"   ❌ No se pudo realizar el diagnóstico seguro del archivo .env: {e}")
    print("================================================================\n")
    sys.exit(1)

def es_de_hoy(fecha_str):
    """Verifica si un string de fecha (formato ISO o YYYY-MM-DD) pertenece al día de hoy."""
    if not fecha_str:
        return False
    try:
        solo_fecha = fecha_str.split("T")[0]
        fecha_dt = datetime.strptime(solo_fecha, "%Y-%m-%d").date()
        hoy = datetime.now().date()
        return fecha_dt == hoy
    except Exception as e:
        print(f"⚠️ Error al evaluar la fecha de la página ({fecha_str}): {e}")
        return False

def auditar_consistencia_diaria():
    print(f"\n🔄 [{datetime.now().strftime('%H:%M:%S')}] Iniciando extracción de datos diarios desde Notion...")
    
    url = f"https://api.notion.com/v1/databases/{DB_RECORDATORIOS_DIARIOS}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    data = {
        "page_size": 30
    }
    
    try:
        # 🛡️ SESIÓN HERMÉTICA (CIERRE AUTOMÁTICO DE SOCKETS)
        with requests.Session() as session:
            session.headers.update(headers)
            response = session.post(url, json=data)
            response.raise_for_status()
            results = response.json().get("results", [])
            
        if not results:
            print("⚠️  [AUDITORÍA]: Conexión exitosa, pero la base de datos está vacía.")
            return

        print(f"📊 Se detectaron {len(results)} registros totales en Notion.")
        
        tareas_consistentes_hoy = 0
        conteo_estados = {}  # Diccionario para agrupar y contar tareas de hoy por estado
        columna_estado = None
        columna_fecha = None
        columna_consistencia = None
        
        # Inspección del primer registro para identificar las columnas por tipo y nombre
        primer_registro = results[0].get("properties", {})
        for nombre_columna, info_columna in primer_registro.items():
            tipo = info_columna.get("type")
            nombre_lower = nombre_columna.lower()
            
            if tipo in ["status", "select"]:
                if nombre_lower in ["estado", "status"]:
                    columna_estado = nombre_columna
                elif ("estado" in nombre_lower or "status" in nombre_lower) and (columna_estado is None or columna_estado.lower() not in ["estado", "status"]):
                    columna_estado = nombre_columna
                elif columna_estado is None and "prioridad" not in nombre_lower and "priority" not in nombre_lower:
                    columna_estado = nombre_columna
            elif tipo == "date":
                columna_fecha = nombre_columna
            
            if "consistencia" in nombre_lower:
                columna_consistencia = nombre_columna

        # Filtrar páginas que corresponden estrictamente al DÍA DE HOY
        paginas_filtradas = []
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
                
            if es_de_hoy(fecha_pagina):
                paginas_filtradas.append(pagina)

        total_tareas_hoy = len(paginas_filtradas)
        print(f"📅 Registros que pertenecen al día de hoy: {total_tareas_hoy}")

        # Procesar filas y calcular estadísticas de consistencia diaria
        for pagina in paginas_filtradas:
            props = pagina.get("properties", {})
            
            # Obtención dinámica del Estado
            estado_val = "Vacío"
            if columna_estado:
                status_data = props.get(columna_estado, {})
                tipo_status = status_data.get("type")
                if tipo_status == "status" and status_data.get("status"):
                    estado_val = status_data["status"].get("name")
                elif tipo_status == "select" and status_data.get("select"):
                    estado_val = status_data["select"].get("name")
            
            # Agrupar en el contador estadístico diario
            conteo_estados[estado_val] = conteo_estados.get(estado_val, 0) + 1
            
            # Obtención dinámica de la Consistencia (Parser multitipo)
            val_consistencia = 0
            if columna_consistencia:
                cons_data = props.get(columna_consistencia, {})
                tipo_cons = cons_data.get("type")
                
                if tipo_cons == "number":
                    val_consistencia = cons_data.get("number", 0)
                elif tipo_cons == "formula":
                    formula_data = cons_data.get("formula", {})
                    formula_type = formula_data.get("type")
                    if formula_type == "number":
                        val_consistencia = formula_data.get("number", 0)
                    elif formula_type == "boolean":
                        val_consistencia = 1 if formula_data.get("boolean") else 0
                    elif formula_type == "string":
                        try:
                            val_consistencia = float(formula_data.get("string", "0"))
                        except ValueError:
                            val_consistencia = 0
                elif tipo_cons == "checkbox":
                    val_consistencia = 1 if cons_data.get("checkbox") else 0
                elif tipo_cons == "select":
                    select_option = cons_data.get("select") or {}
                    option_name = select_option.get("name", "0")
                    try:
                        val_consistencia = float(option_name)
                    except ValueError:
                        val_consistencia = 0

            # Validación de la regla de negocio: Estado "Hecha" AND Consistencia == 1
            if estado_val == "Hecha" and float(val_consistencia) == 1.0:
                tareas_consistentes_hoy += 1

        tasa_constancia = (tareas_consistentes_hoy / total_tareas_hoy) * 100 if total_tareas_hoy > 0 else 0
        print(f"🎯 Auditoría completada: {tareas_consistentes_hoy} de {total_tareas_hoy} tareas consistentes hoy ({round(tasa_constancia, 1)}%)")

        # ----------------------------------------------------------------
        # 🛡️ INYECCIÓN EN EL DASHBOARD HTML (RUTAS ABSOLUTAS)
        # ----------------------------------------------------------------
        html_path = BASE_DIR / "dashboard.html"
        
        if not html_path.exists():
            print(f"❌ [ERROR]: No se encontró el archivo '{html_path}' para sincronizar.")
            return
            
        with open(html_path, "r", encoding="utf-8") as file:
            html_content = file.read()
            
        import re
        # 1. Inyectamos las tareas consistentes encontradas hoy
        html_content = re.sub(
            r"const\s+diasReales\s*=\s*\d+;", 
            f"const diasReales = {tareas_consistentes_hoy};", 
            html_content
        )

        # 2. Inyectamos el total dinámico para calibrar la escala
        html_content = re.sub(
            r"totalDias\s*=\s*\d+;", 
            f"totalDias = {total_tareas_hoy};", 
            html_content
        )

        # 3. Inyectamos el desglose de estados serializado en JSON
        conteo_json = json.dumps(conteo_estados, ensure_ascii=False)
        html_content = re.sub(
            r"const conteoEstadosReales = \{.*?\};", 
            f"const conteoEstadosReales = {conteo_json};", 
            html_content
        )

        with open(html_path, "w", encoding="utf-8") as file:
            file.write(html_content)
            
        print(f"✅ [SINCRONIZACIÓN EXITOSA]: El reporte '{html_path.name}' ha sido actualizado con éxito.")

    except Exception as e:
        print(f"❌ Error crítico durante el pipeline de auditoría: {e}")

if __name__ == "__main__":
    print("================================================================")
    print("🛡️  NOTION FLOW AUDITOR - SERVICIO DE FONDO DIARIO ACTIVO")
    print(f"⏰ El servicio se actualizará automáticamente cada {INTERVALO_SEGUNDOS} segundos.")
    print("👉 Presiona [Ctrl + C] en esta terminal para apagar el servicio de forma limpia.")
    print("================================================================")
    
    while True:
        try:
            auditar_consistencia_diaria()
            print(f"💤 Esperando {INTERVALO_SEGUNDOS} segundos para el próximo ciclo...")
            time.sleep(INTERVALO_SEGUNDOS)
        except KeyboardInterrupt:
            print("\n🛑 [SERVICIO DETENIDO]: Finalizando el proceso de fondo de manera segura...")
            break
        except Exception as e:
            print(f"\n❌ Error en el bucle principal: {e}")
            print("🔄 Esperando 10 segundos antes de reintentar...")
            time.sleep(10)