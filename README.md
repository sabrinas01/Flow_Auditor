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
| [Flujograma](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/Flujograma) | Carpeta con versiones del flujograma |
| [HU](https://app.notion.com/p/35ea38bb7a6e8062952be3e22adfa927?v=35ea38bb7a6e81ad9cb5000cb74ba0ac&source=copy_link) | Enlace a pagina de notion con las historias de usuario |
| [Libro de marca](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/Notion%20Flow%20Auditor%20Brandbook%20by%20Pomelli.pdf) | Archivo generado por la herramienta Pomelli de Google Labs |
| [Diseño visual](https://github.com/sabrinas01/Flow_Auditor/blob/main/Documentacion/DESIGN.md) | Parte visual generada por la herramienta Stich de Google Labs |

## Reglas de negocio

La propiedad **Consistencia** es una fórmula de Notion, definida igual en las bases de Recordatorios Diarios y Recordatorios Varios:

```
if(prop("Estado") == "Hecha" or prop("Estado") == "Hecha por otra persona" or prop("Estado") == "No necesaria", 1, 0)
```

Es decir, un ítem es consistente (`Consistencia = 1`) si su **Estado** es `Hecha`, `Hecha por otra persona` o `No necesaria`.

> **Nota de implementación:** el pipeline actual (`extract_and_audit.py`) no lee la propiedad `Consistencia` de Notion — agrupa las tareas por `Estado` y delega en el frontend (`esEstadoCompletado()`) decidir cuáles cuentan como "hechas" para la tasa mostrada en el dashboard. Ese criterio de texto (`hecha`, `hecho`, `completad`, `done`) **no incluye** `No necesaria`, a diferencia de la fórmula real de Notion. Ver detalle completo en [PRD §4.1](Documentacion/PRD.md).

## Arquitectura

```
Notion API
    │
    ▼
extract_and_audit.py   (GitHub Actions)
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