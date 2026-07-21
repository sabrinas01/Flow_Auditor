# 📋 NFA — Notion Flow Auditor

> Herramienta de auditoría y visualización de consistencia diaria sobre una base de datos de Notion.

## Contexto

NFA nace para resolver un problema concreto de seguimiento personal: verificar de forma objetiva si las tareas diarias registradas en Notion cumplen con un criterio de consistencia definido, y comunicar ese estado en un dashboard claro, sin depender de revisar la base de datos manualmente.

Este proyecto forma parte de mi portfolio como analista técnico-funcional: documenta el proceso completo desde el levantamiento de requisitos hasta la implementación.

## 📑 Documentación del proyecto

| Documento | Descripción |
|---|---|
| [PRD](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/PRD.md) | Documento de requisitos del producto |
| [SRS](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/SRS.md) | Especificación de requisitos de software |
| [Flujograma](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/Flujograma) | Carpeta con versiones del flujograma|
| [Historias de usuario] (https://app.notion.com/p/35ea38bb7a6e8062952be3e22adfa927?v=35ea38bb7a6e81ad9cb5000cb74ba0ac&source=copy_link)| Enlace a pagina de notion con las historias de usuario|
| [Libro de marca] (https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/Notion%20Flow%20Auditor%20Brandbook%20by%20Pomelli.pdf) | Archivo generado por la herramienta Pomelli de Google Labs |
| [Sistema de diseño actualizado] (https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/DESIGN.md) | Archivo generado por la herramienta Stich de Google Labs |

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

## Autoría

Desarrollado por Sabry @bitacorait