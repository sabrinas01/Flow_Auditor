# Mockups visuales — Flow Auditor

Propósito
- Documentar formalmente la representación visual de pantallas/elementos.
- Incluir versiones, archivos fuente (Figma/Sketch), y criterios de aceptación.

Convenciones
- Nombre de archivo en repo: docs/mockups.md (este documento).
- Carpeta para assets: docs/mockups/assets/
- Versionado: cada mockup deberá tener una clave `mockup_version: MAJOR.MINOR` y fecha.
- Responsables: indicar diseñador y reviewer (p.ej. @raine / @sabrina).

Ejemplo de entrada para un mockup (Search UI v1.0)
- id: search-ui
- title: Barra de búsqueda principal
- mockup_version: 1.0
- author: Raine
- date: 2026-07-31
- source: https://www.figma.com/file/XXXX/Flow-Auditor
- assets:
  - [(https://github.com/sabrinas01/Flow_Auditor/blob/4263baccadec2f534cc4d6a2115a788d3e06ae28/grafica)]

- description:
  - Campo input con placeholder "Buscar..."
  - Comportamiento: debounce de 1.2s antes de emitir la búsqueda
  - Estado: vacío / con texto / con resultados / con error
- acceptance_criteria:
  1. Al teclear, no se debe lanzar la búsqueda hasta 1.2s sin actividad.
  2. Si el usuario presiona Enter, la búsqueda se ejecuta inmediatamente.
  3. UI debe mostrar spinner si la búsqueda tarda más de 300 ms.

Notas de implementación
- Documentar en código la regla crítica (ej. Debounce 1.2s) junto al util/uso.
- Las capturas PNG en docs/mockups/assets deben incluir anotaciones de spacing, colors y font sizes.