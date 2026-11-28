# Mapa de Pantallas de Google Stitch — AsistenteSabry

Índice de trazabilidad entre el proyecto **Asistente de Sabry** en [Google Stitch](https://stitch.google.com/projects/11381590448205856077) y su implementación en código, agrupado por **Flujo / Módulo** y **Versión**.

---

## 1. Inicio (`inicio.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Inicio - AsistenteSabry v4.46` | `v4.75` | `inicio.html` |
| `Modal Edición de Foco Diario - Inicio` | `v4.86` | `inicio.html` (`#widget-foco-inicio`, `#modal-foco-diario`) |
| `Definir Foco & Intención Diaria (v4.87 - ABM & Notion)` | `v4.87` | `inicio.html` + `extract_and_audit.py` (`guardar_foco_diario`) |
| `Historial de Focos por Fase del Ciclo (v4.87)` | `v4.87` | `inicio.html` (`#modal-historial-foco`, `inicioFocoHistorial`) |

---

## 2. Agenda Personal (`agenda-personal.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Agenda personal - AsistenteSabry v4.46` | `v4.14` | `agenda-personal.html` |
| `Agenda personal (v4.80) - AsistenteSabry` | `v4.77` | `agenda-personal.html` |
| `Modal Crear y Editar Evento - Agenda Personal` | `v4.36` / `v4.38` | `agenda-personal.html` (`#modal-crear-tarea`) |
| `Detalle de Evento Seleccionado - Agenda personal (v4.80)` | `v4.86` | `agenda-personal.html` (`#modal-detalle-evento`) + `src/utils/dom_render.js` |

---

## 3. Recordatorios (`recordatorios-diarios.html` / `recordatorios-varios.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Recordatorios diarios - AsistenteSabry v4.46` | `v3.3` / `v4.45` | `recordatorios-diarios.html` |
| `Modal Edición de Tarea - Recordatorios diarios` | `v4.65` / `v4.85` | `recordatorios-diarios.html` (`#modal-editar-diario`) |
| `Recordatorios varios - AsistenteSabry v4.46` | `v4.7` / `v4.77` | `recordatorios-varios.html` |
| `Estados de Vacío Compasivos - Agenda & Recordatorios` | `v4.62` / `v4.86` | `src/utils/dom_render.js` |

---

## 4. Finanzas (`finanzas.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Finanzas - AsistenteSabry v4.46` | `v4.41` / `v4.78` | `finanzas.html` |
| `Modal Registrar Ingreso y Gasto - Finanzas` | `v4.41` | `finanzas.html` |
| `Modal Finanzas Cuotas TC - AsistenteSabry v4.46` | `v4.42` / `v4.56` | `finanzas.html` |
| `Flujo Crítico: Modales Encadenados (Finanzas Cuotas TC → Creación en Vuelo)` | `v4.81` | `finanzas.html` (`#modal-fin-opcion-vuelo`) |

---

## 5. Salud (`salud.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Salud - AsistenteSabry v4.46` | `v4.44` / `v4.54` | `salud.html` |
| `Historial de Síntomas y Ciclos Pasados - Salud` | `v4.61` / `v4.75` | `salud.html` |
| `Historial de Síntomas con Guardrails Destructivos - Salud` | `v4.61` / `v4.83` | `salud.html` (`#salud-undo-toast`) |
| `Modal Editar Fase del Ciclo & Agregar Síntoma - Salud` | `v4.44` / `v4.58` | `salud.html` |
| `Modal Salud Control Médico y Terapia - AsistenteSabry v4.46` | `v4.44` / `v4.57` | `salud.html` |
| `Flujo Crítico: Modales Encadenados (Salud: Síntoma → Medicamento en Vuelo)` | `v4.83` | `salud.html` (`#modal-salud-med-vuelo`) |
| `Modal Registrar en Energía Guiado (v4.92 - Salud)` & `Modal Registrar en Energía - Factor de Recarga (v4.92)` | `v4.92` | `salud.html` (`#modal-energia`) + `src/utils/salud_logic.js` |

---

## 6. Ocio (`ocio.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Ocio - AsistenteSabry v4.46 (Notion Hub)` | `v4.49`–`v4.51` | `ocio.html` |
| `Modal Ocio ABM Multimedia (Notion Hub)` | `v4.50` / `v4.51` | `ocio.html` (`#mediaModal`) |
| `Flujo Crítico: Modales Encadenados (Ocio: Libro → Crear Autor en Vuelo)` | `v4.82` | `ocio.html` (`#modal-ocio-autor-vuelo`) |

---

## 7. Gestión Emocional (`gestion-emocional.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Gestión emocional - AsistenteSabry v4.46` | `v4.52` / `v4.68` / `v4.84` | `gestion-emocional.html` |
| `Gestión Emocional - Herramientas Conscientes & Protocolo S.T.O.P.` | `v4.75` / `v4.78` | `gestion-emocional.html` |
| `Modal Protocolo Guiado S.T.O.P. - AsistenteSabry v4.46` | `v4.52` / `v4.78` | `gestion-emocional.html` |

---

## 8. Relaciones y Límites (`relaciones-y-limites.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Relaciones y límites - AsistenteSabry v4.46` | `v4.53` | `relaciones-y-limites.html` |
| `Modal ABM Afirmaciones y Frases Asertivas - Relaciones y Límites` | `v4.53` / `v4.78` | `relaciones-y-limites.html` |

---

## 9. Desarrollo Personal (`desarrollo-personal.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Desarrollo personal - AsistenteSabry v4.46` | `v4.55` | `desarrollo-personal.html` |
| `Desarrollo personal - CRUD de Recursos & Prácticas` | `v4.63` / `v4.80` | `desarrollo-personal.html` |
| `Modal Desarrollo Personal` & `Modal Crear y Editar Recurso Multimodal` | `v4.55` / `v4.63` | `desarrollo-personal.html` |
| `Flujo Crítico: Modales Encadenados (Práctica → Recurso en Vuelo)` | `v4.73` | `desarrollo-personal.html` (`#modal-recurso-vuelo`) |
| `Flujo Crítico: Confirmación Destructiva & Guardrail Compasivo` | `v4.74` | `desarrollo-personal.html` (`#modal-guardrail-desarrollo`, `#modal-papelera-dp`) |
| `Modal Desarrollo Personal - Paso 1: Elegir Pilar y Tipo (v4.94)` & `Paso 2: Detalle Guiado (v4.94)` | `v4.94` | `desarrollo-personal.html` (`#modal-desarrollo`) |
| `Modal Desarrollo Personal - Paso 2: Ejercicio Práctico con Hábito (v4.95)` | `v4.95` | `desarrollo-personal.html` + `habitos-y-disciplina.html` + `extract_and_audit.py` |

---

## 10. Hábitos y Disciplina (`habitos-y-disciplina.html`)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Hábitos y disciplina - AsistenteSabry v4.46` | `v4.66` / `v4.67` | `habitos-y-disciplina.html` |
| `Matriz de Rachas y Heatmap Anual de Hábitos` | `v4.75` | `habitos-y-disciplina.html` |
| `Modal Crear y Editar Hábito` & `Modal Crear y Editar Formación` | `v4.66` / `v4.67` | `habitos-y-disciplina.html` |
| `Flujo Crítico: Modales Encadenados (Hábito → Formación en Vuelo)` | `v4.75` | `habitos-y-disciplina.html` |
| `Hábitos Diarios, Check Rápido & Matriz Real (v4.93)` | `v4.93` | `habitos-y-disciplina.html` + `src/utils/habitos_logic.js` + `extract_and_audit.py` |

---

## 11. Shell Transversal, Guardrails & Assets (`somatic_shell.js` / `dom_render.js` / PWA)

| Pantalla / Artefacto en Stitch | Versión | Implementación en código |
|---|---|---|
| `Command Palette Spotlight (Cmd + K)` | `v4.57` / `v4.75` | `src/utils/somatic_shell.js` (`#ss-modal-spotlight`) |
| `Modal Atajos de Teclado & Modo Focus` | `v4.62` / `v4.75` | `src/utils/somatic_shell.js` (`#ss-modal-atajos`) |
| `Centro de Notificaciones Somáticas & Feed de Actividad` | `v4.64` / `v4.75` | `src/utils/somatic_shell.js` (`#ss-drawer-notifs`) |
| `Centro de Notificaciones Somáticas - Zero Inbox Somático (Todo en Calma)` | `v4.75` | `src/utils/somatic_shell.js` (`_iniciarBoxBreathing`) |
| `Modal Configuración y Preferencias de Alertas Somáticas` | `v4.75` | `src/utils/somatic_shell.js` (`#ss-modal-prefs`) |
| `Centro de Exportación de Reportes Clínicos y Financieros` | `v4.62` / `v4.75` | `src/utils/somatic_shell.js` (`#ss-modal-exportar`) |
| `Modo de Resguardo Offline / Notion Sync Fallback` | `v4.62` / `v4.75` | `src/utils/somatic_shell.js` (`#ss-offline-banner`) |
| `Modal Guardrail Destructivo Compasivo` & `Retorno Seguro en Modales` | `v4.73`–`v4.83` | Modales de confirmación + Capa 2 en módulos |
| `manifest.json`, `Recursos web.md`, Favicon & Apple Touch Icon | `v4.16` | `manifest.json`, `sw.js`, `grafica/` |
| Documentos de referencia (`Auditoría UX`, `Guía UX Mensajes de Error`) | `v4.46` | Base de referencia en Stitch / `Documentacion/DESIGN.md` |
