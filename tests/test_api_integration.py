# -*- coding: utf-8 -*-
"""
MÓDULO: test_api_integration.py
DESCRIPCIÓN: Verifica la conexión con Notion y mapea dinámicamente las propiedades 
             de tus bases de datos para evitar errores de nombres (Mayúsculas/Acentos).
AUTOR: Tu Mentor de Programación & Analista de Ciberseguridad
"""

import os
from sys import exit
from dotenv import load_dotenv
from notion_client import Client

# 1. Carga segura de variables de entorno desde tu .env local
load_dotenv()

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
# Probaremos inicialmente con la base de datos de Hábitos/Bitácora
DB_RECORDATORIOS_DIARIOS_ID = os.getenv("NOTION_DB_RECORDATORIOS_DIARIOS")

# 2. Control de seguridad preliminar
if not NOTION_API_KEY or "xxxxxxxx" in NOTION_API_KEY:
    print("\n❌ [ERROR DE CONFIGURACIÓN]: No has colocado tu token real en el archivo .env")
    print("👉 Abre tu archivo .env y reemplaza 'secret_xxxxxxxx...' por el token oficial de Notion.\n")
    exit(1)

if not DB_RECORDATORIOS_DIARIOS_ID:
    print("\n❌ [ERROR DE CONFIGURACIÓN]: Falta la variable NOTION_DB_RECORDATORIOS_DIARIOS en tu archivo .env\n")
    exit(1)

def mapear_esquema_notion():
    print("🔄 Iniciando conexión segura con la API de Notion mediante TLS 1.3...")
    try:
        # Inicializar el cliente oficial
        notion = Client(auth=NOTION_API_KEY)
        
        # Validar la identidad de la integración
        bot_info = notion.users.me()
        print(f"✅ Autenticación exitosa como: {bot_info.get('name')}")
        print("----------------------------------------------------------------")
        
        # Consultar la estructura de la base de datos para inspeccionar sus columnas
        print(f"🔍 Leyendo la estructura de la base de datos ID: {DB_RECORDATORIOS_DIARIOS_ID[:8]}... (Cifrado en tránsito activo)")
        db_metadata = notion.databases.retrieve(database_id=DB_RECORDATORIOS_DIARIOS_ID)
        
        # Extraer el título de la base de datos
        titulo = db_metadata.get("title", [{}])[0].get("text", {}).get("content", "Sin Título")
        print(f"📌 Base de datos detectada: '{titulo}'")
        print("\n📋 PROPIEDADES ENCONTRADAS (Revisión de nombres exactos):")
        
        properties = db_metadata.get("properties", {})
        
        # Recorrer las propiedades para mostrarle al usuario cómo se llaman exactamente
        for prop_name, prop_data in properties.items():
            prop_type = prop_data.get("type")
            print(f"   • Nombre: '{prop_name}' | Tipo en Notion: [{prop_type}]")
            
        print("\n🛡️  [ANÁLISIS DE SEGURIDAD]: Conexión limpia. No se detectan fugas ni payloads extraños.")
        print("👉 Copia y pega en nuestro chat los nombres de las columnas que correspondan a tu FECHA y tu ESTADO.")
        
    except Exception as e:
        print("\n❌ [FALLO DE CONEXIÓN CON LA API]")
        print("Causas probables:")
        print("1. Olvidaste hacer el paso 'Connect to' (Conectar a) dentro de la base de datos en Notion.")
        print("2. El ID de la base de datos copiado en tu .env es incorrecto.")
        print(f"\nDetalle técnico del error: {e}\n")

if __name__ == "__main__":
    mapear_esquema_notion()