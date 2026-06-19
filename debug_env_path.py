# -*- coding: utf-8 -*-
"""
MÓDULO: debug_env_path.py
DESCRIPCIÓN: Diagnóstica la ubicación del archivo .env y el directorio activo
             de la terminal para resolver problemas de lectura de credenciales.
AUTOR: Tu Mentor de Programación & Analista de Ciberseguridad
"""

import os
import sys

print("🔍 [INICIANDO DIAGNÓSTICO DE SEGURIDAD Y RUTAS]\n")

# 1. Verificar el directorio de trabajo actual de la terminal
directorio_actual = os.getcwd()
print(f"📁 Tu terminal está parada en: \n   👉 '{directorio_actual}'\n")

# 2. Buscar el archivo .env en el directorio actual
env_en_directorio = os.path.exists(".env")
print(f"❓ ¿Existe un archivo llamado '.env' en esta carpeta exacta? \n   👉 {'✅ SÍ' if env_en_directorio else '❌ NO'}\n")

# 3. Listar archivos clave en el directorio para entender dónde estamos
try:
    archivos = os.listdir(".")
    print("scandal 📋 Archivos detectados en la carpeta actual:")
    for archivo in archivos:
        if archivo.endswith(".py") or archivo == ".env" or archivo == "dashboard.html":
            print(f"   • {archivo}")
except Exception as e:
    print(f"❌ No se pudieron listar los archivos: {e}")

# 4. Comprobación de seguridad de variables de entorno (Sin mostrar tu API Key real)
print("\n🛡️  [ANÁLISIS DE VARIABLES CARGADAS EN EL SISTEMA]:")
from dotenv import load_dotenv
load_dotenv()

key_detectada = os.getenv("NOTION_API_KEY")
db_detectada = os.getenv("NOTION_DB_HABITS")

if key_detectada:
    # Mostramos solo el inicio para validar que existe sin exponer tu seguridad
    print(f"   • NOTION_API_KEY: ✅ Detectada (Empieza con '{key_detectada[:10]}...')")
else:
    print("   • NOTION_API_KEY: ❌ No detectada o vacía")

if db_detectada:
    print(f"   • NOTION_DB_HABITS: ✅ Detectada (ID: '{db_detectada[:8]}...')")
else:
    print("   • NOTION_DB_HABITS: ❌ No detectada o vacía")

print("\n----------------------------------------------------------------")
print("👉 Ejecuta este script y compárteme la salida para solucionar tu ruta.")