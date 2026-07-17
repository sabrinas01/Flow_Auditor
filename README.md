# 📋 NFA — Notion Flow Auditor

> Herramienta de auditoría y visualización de consistencia diaria sobre una base de datos de Notion.

## Contexto

NFA nace para resolver un problema concreto de seguimiento personal: verificar de forma objetiva si las tareas diarias registradas en Notion cumplen con un criterio de consistencia definido, y comunicar ese estado en un dashboard claro, sin depender de revisar la base de datos manualmente.

Este proyecto forma parte de mi portfolio como analista técnico-funcional: documenta el proceso completo desde el levantamiento de requisitos hasta la implementación.

## 📑 Documentación del proyecto

| Documento | Descripción |
|---|---|
| [SRS](docs/SRS.md) | Especificación de requisitos de software |
| [PRD](docs/PRD.md) | Documento de requisitos del producto |
| [Flujograma](docs/flujograma.png) | Diagrama de flujo del proceso de auditoría |

## Reglas de negocio

La consistencia de una tarea se determina mediante un filtro compuesto AND:

- El campo **Estado** debe ser exactamente `"Hecha"`
- La propiedad **Consistencia** debe ser igual a `1`

Solo si ambas condiciones se cumplen, la tarea se contabiliza como consistente en el dashboard.

## Arquitectura

```
Notion API
    │
    ▼
extract_and_audit.py   (GitHub Actions, corre cada hora)
    │  extrae y audita tareas según reglas de negocio
    ▼
generate_dashboard.py
    │  reescribe index.html con los datos actualizados
    ▼
index.html   (dashboard estático)
```

## Características

- Sincronización horaria automática vía GitHub Actions
- Evaluación de consistencia mediante regla compuesta (Estado + Consistencia)
- Escala de visualización que se adapta al volumen real de tareas extraídas
- Alertas de rendimiento a partir de un umbral del 70%
- Manejo de encoding para archivos generados en entorno Windows (UTF-16 LE, BOM)

## Stack técnico

- Python (extracción y procesamiento)
- Notion API
- GitHub Actions (automatización)
- HTML / Tailwind / JavaScript (dashboard)

## Instalación

```bash
git clone https://github.com/tu-usuario/nfa.git
cd nfa
pip install -r requirements.txt
```

## Configuración

Crear un archivo `.env`:

```
NOTION_TOKEN=tu_token_aca
NOTION_DATABASE_ID=tu_database_id
```

## Uso

```bash
python extract_and_audit.py   # extrae y audita datos de Notion
python generate_dashboard.py  # regenera index.html
```

## Aprendizajes técnicos

- Manejo de corrupciones de encoding (UTF-16 LE, BOM) generadas al crear archivos desde PowerShell en Windows
- Uso de `requests.Session` para gestionar el ciclo de vida de las conexiones HTTP contra la API de Notion

## Autoría

Desarrollado por Sabry.
```