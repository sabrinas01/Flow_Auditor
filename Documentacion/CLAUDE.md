# Notion Flow Auditor (NFA) — instrucciones para Claude Code

## Regla de documentación versionada

Este proyecto documenta su evolución en tres lugares que deben moverse juntos.
**Cada vez que un cambio en este repo modifique comportamiento, alcance,
arquitectura o requisitos** (no aplica a fixes de tipeo, formato, o cambios
puramente internos sin impacto funcional), antes de dar la tarea por
terminada:

1. **`Documentacion/PRD.md`**
   - Si el cambio altera alcance, visión, personas, reglas de negocio o
     estructura de interfaz: subir el campo `Versión` (sección 1) y agregar
     una fila a la tabla `## 🕘 Historial de versiones` (al final del
     documento) con versión, fecha y descripción del cambio.

2. **`Documentacion/SRS.md`**
   - Agregar/editar el requisito funcional o no funcional correspondiente
     (`SRS-FR-*` / `SRS-NFR-*`) dentro del módulo que corresponda.
   - Subir el campo `Versión` del encabezado y agregar una fila a
     `## 🛠️ HISTORIAL DE CONTROL DE VERSIONES`.
   - Las versiones de PRD y SRS deben quedar sincronizadas (mismo número).

3. **Historias de Usuario en Notion** — base `📜 NFA Tareas de desarrollo`
   (workspace de Sabrina, ver link en `README.md`).
   - Data source: `collection://35ea38bb-7a6e-8104-92cd-000b74511ee7`.
   - Si el cambio implementa o modifica una HU existente: usar las
     herramientas MCP de Notion (`notion-search` / `notion-fetch` /
     `notion-create-pages` / `notion-update-page`) para crear o actualizar la
     página correspondiente, completando `Titulo`, `Como (usuario/rol)`,
     `Quiero (acción/funcionalidad)`, `Para (valor/beneficio)`,
     `Criterios BDD`, `DOR`, `DOD`, `Épica` y `Estado`.
   - Si existe un requisito SRS asociado, enlazarlo vía la propiedad relacional
     `Trazabilidad SRS (RF/RNF)`.
   - Nunca inventar una HU sin confirmar antes con Sabrina el texto de
     `Quiero` / `Para` cuando implique una decisión de producto nueva (no una
     continuación obvia de algo ya charlado en la conversación).

4. **Commit**: los cambios de documentación van en el mismo commit que el
   cambio de código que los motiva (o, si ya se commiteó el código, en un
   commit inmediato siguiente `docs(sync): ...`). Así el historial de git
   queda como la fuente de verdad de *cuándo* cambió cada versión de la doc.

## Enforcement automático

Hay un workflow (`.github/workflows/docs_sync_check.yml`) que falla en los PR
a `main` si se tocan archivos funcionales (`extract_and_audit.py`,
`generate_dashboard.py`, `index.html`, `src/**`,
`.github/workflows/notion_sync.yml`) sin que `Documentacion/PRD.md` o
`Documentacion/SRS.md` cambien en el mismo PR. Si un cambio realmente no
amerita tocar la doc (config interna, CI de tooling, tests), agregar
`[skip-docs]` en el mensaje del commit para saltear el check — pero evaluar
primero si de verdad no aplica antes de usarlo.

## Contexto rápido del proyecto

Ver `README.md` para arquitectura y stack. Reglas de negocio, personas y
requisitos viven en `Documentacion/PRD.md` y `Documentacion/SRS.md` — son la
fuente de verdad, no la infieras solo del código.
