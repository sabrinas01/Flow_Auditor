# Notion Flow Auditor (NFA) — instrucciones para Claude Code

## Regla de documentación versionada

Este proyecto documenta su evolución en varios lugares que deben moverse juntos.
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

4. **Requisitos SRS en Notion** — base `📋 Requisitos SRS (RF + RNF) — v4.17`
   (workspace de Sabrina).
   - Data source: `collection://582dd387-00da-4075-bcf4-ca01517ace84`.
   - Si el cambio en `Documentacion/SRS.md` agrega, modifica o retira un
     requisito (`SRS-FR-*` / `SRS-NFR-*`), reflejar el mismo cambio acá:
     crear la página con `Requisito`, `Nombre del Requisito`, `Descripción`,
     `Tipo` (RF/RNF), `Módulo` y `Versión`, o actualizar la existente.
   - El título de esta base incluye el número de versión del SRS
     (`— vX.Y`) — actualizarlo cuando la base quede totalmente sincronizada
     con una nueva versión del SRS, para que no vuelva a desincronizarse en
     silencio como pasó entre v3.3 y v4.17 (14 requisitos faltantes y 2
     marcados como fusionados/deprecados incorrectamente).
   - Si existe una HU asociada, enlazarla vía la propiedad relacional
     `Historias de Usuario` (o desde el otro lado, `Trazabilidad SRS (RF/RNF)`
     en la HU).

5. **Plan de Pruebas y Matriz de Trazabilidad** — página de Notion
   "📄 Plan de Pruebas y Matriz de Trazabilidad" (bajo el título `Plan NFA`).
   - Si el cambio agrega, modifica o retira un requisito SRS, o cambia la
     cobertura de test existente (tests nuevos, tests eliminados, un gap que
     se cierra): actualizar la matriz de trazabilidad FR/NFR correspondiente
     (sección 2/3), la tabla de gaps (sección 5) si corresponde, y agregar un
     escenario BDD nuevo (sección 4) si el cambio lo amerita.
   - Usar `notion-fetch` para traer el contenido actual antes de editar, y
     `notion-update-page` (`update_content` con `content_updates`, o
     `insert_content`) para aplicar el cambio — nunca `replace_content` salvo
     que se necesite reescribir el documento entero.

6. **Commit**: los cambios de documentación van en el mismo commit que el
   cambio de código que los motiva (o, si ya se commiteó el código, en un
   commit inmediato siguiente `docs(sync): ...`). Así el historial de git
   queda como la fuente de verdad de *cuándo* cambió cada versión de la doc.

## Tageo de releases (versión visible en producción)

El footer de `index.html` muestra el tag de git más reciente
(`git describe --tags --abbrev=0`, ver `obtener_version_actual()` en
`extract_and_audit.py`) — **no** el número de versión de PRD/SRS
directamente. Para que no se desincronicen (como pasó: producción mostraba
`v1.0.0` mientras PRD/SRS ya iban por v3.9):

- Cuando un cambio en PRD/SRS es **producto/comportamiento visible**
  (no gobernanza pura de documentación, no un typo, no un fix de CI
  interno): crear un tag de git anotado que coincida con esa versión
  (`git tag -a v3.X -m "..."`) y pushearlo (`git push origin v3.X`).
- No hace falta tagear cada bump de PRD/SRS — varios de esos bumps son
  puramente de gobernanza de documentación y no ameritan un "release".
  Usar criterio: ¿un usuario notaría este cambio en el dashboard? Si sí,
  tagear.
- Nunca hardcodear un número de versión en comentarios/docstrings del
  código (se desactualiza solo) — la fuente de verdad es el tag de git.

## Enforcement automático

Hay un workflow (`.github/workflows/docs_sync_check.yml`) que falla en los PR
a `main` si se tocan archivos funcionales (`extract_and_audit.py`,
`generate_dashboard.py`, `index.html`, `recordatorios-varios.html`,
`agenda-personal.html`, `manifest.json`, `sw.js`, `src/**`,
`.github/workflows/notion_sync.yml`) sin que `Documentacion/PRD.md` o
`Documentacion/SRS.md` cambien en el mismo PR. Si un cambio realmente no
amerita tocar la doc (config interna, CI de tooling, tests), agregar
`[skip-docs]` en el mensaje del commit para saltear el check — pero evaluar
primero si de verdad no aplica antes de usarlo.

Este gate solo verifica `PRD.md`/`SRS.md`. Los tres destinos en Notion (HU,
Requisitos SRS y Plan de Pruebas y Matriz de Trazabilidad) no tienen
enforcement automático — dependen de seguir esta checklist en cada cambio
funcional.

## Contexto rápido del proyecto

Ver `README.md` para arquitectura y stack. Reglas de negocio, personas y
requisitos viven en `Documentacion/PRD.md` y `Documentacion/SRS.md` — son la
fuente de verdad, no la infieras solo del código.
