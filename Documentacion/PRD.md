# Product Requirements Document (PRD) — Notion Flow Auditor (NFA)

## 📌 1. Información General del Producto
* **Nombre:** Notion Flow Auditor (NFA)
* **Marca Asociada:** Bitácora IT
* **Rol de Gobierno:** IT Functional Analyst (Sabrina) & Mentor Técnico de IA
* **Estado:** Listo para Desarrollo (Base Lineal Validada)
* **Versión:** 4.11
* **Zona Horaria de Referencia:** GMT -3 (San Juan, Argentina)

## 🎯 2. Visión General y Contexto
### 2.1. Propósito
Calcular la consistencia operativa diaria analizando tareas repetitivas en Notion, superando limitaciones visuales con un panel móvil estático optimizado, segmentado cronológicamente (Ayer, Hoy, Mañana), e incorporando un módulo de bienestar y diagnóstico técnico.

### 2.2. Modelo de Arquitectura Híbrida Desacoplada
* **Backend Extractor (Python 3.10):** Daemon invisible (Windows) o asíncrono (GitHub Actions). Consulta **dos bases de Notion independientes** (Recordatorios Diarios y Recordatorios Varios) y realiza inyección dinámica de datos (JSON) sobre los archivos `index.html` y `recordatorios-varios.html` respectivamente, en el mismo ciclo horario.
* **Frontend Responsivo (HTML5/Tailwind/JS):** Alojado en GitHub Pages. Lógica matemática de cómputo en cliente.

## 👥 3. Personas y Usuarios
* **Usuario:** Sabrina Sanso (Analista de Flujo Personal).
* **Necesidades:** Monitoreo ágil, diseño móvil pulido (Brand Book Pomelli) y soporte ante el burnout.

## ⚙️ 4. Alcance Funcional y Lógica
### 4.1. Cálculo de Consistencia
Tasa = (Tareas "Hecha" AND fórmula "consistencia"=1 / Total de Tareas Creadas) x 100.

### 4.2. Jerarquía de Estados (Orden estricto)
1. Sin empezar | 2. En ejecución | 3. Hecha por otra persona | 4. No necesaria | 5. Hecha | 6. Fallida / Vencida.

### 4.3. Módulo Emocional (Alerta de Bienestar)
* **Condición:** Si la tasa de consistencia es < 70% durante $\ge 4$ días en la semana.
* **Mensaje:** "Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨"

## 🎨 5. Estructura de la Interfaz
### 5.1. Recordatorios Diarios (`index.html`)
* **Paleta:** Negro azabache, Obsidiana Black, Rojo Toscano, Rojo suave, Clementine Orange.
* **Secciones:** * I: Tareas de ayer.
    * II: Tareas de hoy (Alertas < 70% en Clementine Orange).
    * III: Balance Semanal y Bienestar (Tabla 7 días + Caja de Mentora).
    * V: Panel de Diagnóstico Técnico (Footer: última/próxima sync, volumen de tareas).
    * VI: Navegación (Botón a recordatorios diarios).
* **Indicador de Versión:** Posicionado abajo a la izquierda (bajo el botón del footer), inyectado vía GitHub Releases (v3.3).

### 5.2. Recordatorios Varios (`recordatorios-varios.html`)
* Módulo alimentado por su **propia base de Notion independiente** (`NOTION_DB_RECORDATORIOS_VARIOS`) — no comparte datos con Recordatorios Diarios. Reutiliza el mismo Design System "Obsidian Refined" (paleta, tipografía, sidebar, header, footer) que Recordatorios Diarios.
* **Modelo de datos (v4.11):** se filtra y clasifica por las mismas tres ventanas cronológicas que Recordatorios Diarios (Ayer/Hoy/Mañana, GMT-3) — pero a diferencia de Recordatorios Diarios, cada bloque **no** agrega por conteo de estados: renderiza una **lista de ítems individuales**, cada uno con Nombre, Estado, Prioridad, Área, Periodo y Fecha. (En v4.10 el módulo mostraba *todos* los ítems de la BD sin filtrar por fecha, mezclando recordatorios de cualquier día — corregido en v4.11.)
* **Secciones:** * I: Recordatorios de ayer (card colapsable, lista de ítems).
    * II: Recordatorios de hoy (card colapsable, lista de ítems).
    * III: Recordatorios de mañana (card colapsable, lista de ítems).
    * IV: CTA "Ver en Notion" + Panel de Diagnóstico Técnico (footer, igual a §5.1-V).
* **Sin balance semanal ni Módulo de Bienestar** (§4.3): esas secciones son propias de Recordatorios Diarios; este módulo no las duplica.
* **Navegación:** accesible desde el sidebar de `index.html`/`inicio.html` (ítem "Recordatorios varios").
* **Aislamiento de fallos (v4.10):** hasta v4.9, `NOTION_DB_RECORDATORIOS_VARIOS` era obligatoria y se consultaba en el mismo bloque que Recordatorios Diarios — un 401/500/timeout en esa base abortaba **todo** el pipeline, incluyendo Recordatorios Diarios. Ahora es **opcional** y se sincroniza en un segundo paso aislado: cualquier fallo ahí se loguea y se omite, sin afectar la sincronización ya exitosa de `index.html`.

## 🔒 6. Requerimientos No Funcionales
* **Seguridad:** `.env` local, tokens inyectados como secretos.
* **Rendimiento:** Daemon < 2% CPU, < 50MB RAM.
* **Sincronización:** Automática cada 1 hora.
* **Performance Web:** Carga < 1.5s en 4G/5G.

## 🚫 7. Fuera de Alcance
* Escritura o modificación en Notion (Lectura/Auditoría solamente).
* Autenticación OAuth2 (modelo basado en `.env` local).

## 🧪 8. Criterio de Aceptación Core (BDD)
* **Escenario:** Automatización del ciclo de 1 hora y Alerta de Bienestar.
* **Dado** que el Daemon finalizó sincronización a las 14:00 y se detectaron 4 días con rendimiento < 70%.
* **Cuando** el reloj llega a las 15:00.
* **Entonces** debe despertar, procesar, publicar el `index.html` con la inyección de versión v3.3, mostrar la alerta de la mentora en el balance semanal y programar la próxima sincronización para las 16:00.

## 🕘 9. Historial de versiones

| Versión | Fecha | Descripción del cambio |
| :--- | :--- | :--- |
| **v3.3** | Julio 2026 | Baseline oficial sincronizada con SRS v3.3 (ver `SRS.md` para el detalle técnico completo). |
| **v3.4** | Agosto 2026 | Se formaliza la gobernanza de documentación versionada: cada cambio funcional debe actualizar PRD, SRS e Historias de Usuario (Notion) en el mismo PR, reforzado por el gate de CI `docs_sync_check.yml` (ver `SRS.md` — `SRS-FR-M2-205` — y `CLAUDE.md`). |
| **v3.5** | Agosto 2026 | Se implementa la Sección IV (§5) — "Vista previa de mañana" — que estaba especificada pero nunca renderizada en `index.html`. Alcance reducido a título/estado (sin completadas/consistencia ni colapsar/expandir), ver `SRS.md` v3.5 para el detalle. |
| **v3.6** | Agosto 2026 | Corrección de alcance: "Tareas para mañana" no pertenece a Recordatorios Diarios — se revierte de `index.html` y pasa a ser alcance del futuro módulo Recordatorios Varios (HU ya creada en Notion). Ver `SRS.md` v3.6 — `SRS-FR-M3-303` reescrito. |
| **v3.7** | Agosto 2026 | Las cards de Ayer y Hoy ahora colapsan/expanden de forma independiente; se agregan tests con HTTP mockeado (conexión exitosa y fallos 401/500) para `extract_and_audit.py`. Ver `SRS.md` v3.7. |
| **v3.8** | Agosto 2026 | El `.env` local ahora se normaliza automáticamente si tiene BOM (UTF-8-SIG o UTF-16, comunes al generarlo desde PowerShell en Windows), cerrando `SRS-FR-M1-104`. Ver `SRS.md` v3.8. |
| **v3.9** | Agosto 2026 | Se elimina el componente React huérfano (`SearchBar.js`, incompatible con el stack estático) y se reescriben `debounce.js`/`src_localStorage_index.js` a vanilla JS, conectándolos de verdad a `index.html`. Ver `SRS.md` v3.9. |
| **v4.0** | Agosto 2026 | Se resuelve la versión desincronizada: producción mostraba `v1.0.0`. Se eliminan los números hardcodeados sueltos y se establece que el tag de git es la única fuente de verdad de la versión en producción. Se tagea `v4.0`. Ver `SRS.md` v4.0. |
| **v4.1** | Agosto 2026 | Se resuelve el check `lighthouse` en rojo: accesibilidad 88→100 (contraste, zoom móvil) y performance 37→68 (se reemplaza el CDN de Tailwind por CSS estático, se acota la fuente de íconos, se comprime el logo). Primera vez que el proyecto suma una dependencia de build (Node, solo para el CSS). Ver `SRS.md` v4.1. |
| **v4.2** | Agosto 2026 | Primeros tests de JS corriendo de verdad en el repo (Jest): 34 tests nuevos para el motor de consistencia, la alerta de bienestar semanal y el debounce compartido — este último con un bug real que los tests encontraron y se corrigió. Ver `SRS.md` v4.2. |
| **v4.3** | Agosto 2026 | Se agregan tests de cron, inyección de versión y cálculo de próxima sincronización — cierra los últimos gaps de la HU "Despliegue Automatizado y Trazabilidad de Versiones". Ver `SRS.md` v4.3. |
| **v4.4** | Agosto 2026 | Se implementa el monitoreo de RAM dentro del script (antes solo existía como test externo); se implementa por primera vez la jerarquía de estados del §4.2 (nunca estuvo codificada, solo documentada); se agregan tests de renderizado DOM. Ver `SRS.md` v4.4 — `SRS-FR-M3-308` nuevo. |
| **v4.5** | Agosto 2026 | Se agrega test de paridad entre la ruta local (`.env`) y la ruta CI (Secrets) para la resolución de credenciales, cerrando el último gap de la HU "Orquestación y Bifurcación CI/CD Local". Se descarta `.env.example` por decisión de producto. Ver `SRS.md` v4.5. |
| **v4.6** | Agosto 2026 | `inicio.html` pasa a ser la página principal del sitio: `index.html` (el dashboard) ahora redirige automáticamente a `inicio.html` la primera vez que se accede en una sesión de navegador (vía `sessionStorage`), sin romper la navegación posterior desde el sidebar de `inicio.html` hacia `index.html`. Cambio de enrutamiento en el frontend; no afecta la plantilla de inyección de datos ni el pipeline de CI. Ver `SRS.md` v4.6. |
| **v4.7** | Agosto 2026 | Se implementa el módulo **Recordatorios Varios** (`recordatorios-varios.html`), a partir del diseño Stitch aportado por Sabrina: reutiliza Ayer/Hoy y agrega la card "Tareas planificadas" (Mañana) que había quedado fuera de alcance en v3.6. El sidebar de `index.html`/`inicio.html` habilita el ítem "Recordatorios varios" (antes "Próximamente"). `extract_and_audit.py` ahora sincroniza ambos frontends en el mismo ciclo horario. Ver `SRS.md` v4.7. |
| **v4.8** | Agosto 2026 | **Fix de despliegue:** el paso de publicación de `notion_sync.yml` solo hacía `git add index.html` — `recordatorios-varios.html` nunca llegaba a `gh-pages` pese a que `extract_and_audit.py` sí lo actualizaba en el runner cada hora (quedó comprobado: el commit horario automático solo tocaba `index.html` desde que se implementó el módulo en v4.7). El módulo estaba deployado pero congelado con datos de placeholder. Ver `SRS.md` v4.8. |
| **v4.9** | Agosto 2026 | **Recordatorios Varios pasa a tener su propia base de Notion:** hasta esta versión, `recordatorios-varios.html` mostraba los mismos números que `index.html` — `extract_and_audit.py` consultaba una única base (`DB_RECORDATORIOS_DIARIOS`) y duplicaba el resultado en ambos frontends. Se agrega `NOTION_DB_RECORDATORIOS_VARIOS` como credencial requerida independiente; el backend ahora hace dos consultas separadas a Notion y cada frontend recibe los datos de su propia base. Ver `SRS.md` v4.9. |
| **v4.10** | Agosto 2026 | **Aislamiento de fallos + lista individual en Recordatorios Varios (HU "Conectar e implementar bd recordatorios varios"):** `NOTION_DB_RECORDATORIOS_VARIOS` pasa a ser **opcional**, y su sincronización corre en un segundo paso aislado del de Recordatorios Diarios — un 401/500/timeout o la ausencia del secret ya no abortan `index.html`, que hasta v4.9 se rompía si Recordatorios Varios fallaba. Además, `recordatorios-varios.html` deja el patrón de conteos Ayer/Hoy/Mañana (v4.7) y pasa a renderizar una **lista plana de ítems individuales** con Nombre, Estado, Prioridad, Área, Periodo y Fecha por recordatorio — pero sin filtrar por fecha, mostrando el universo completo de la BD. Ver `SRS.md` v4.10 — `SRS-FR-M4-401` a `SRS-FR-M4-404` reescritos. |
| **v4.11** *(Actual)* | Agosto 2026 | **Fix: Recordatorios Varios filtra por Ayer/Hoy/Mañana:** v4.10 mostraba *todos* los ítems de "Mis Recordatorios varios V0" sin filtrar por fecha, mezclando recordatorios de cualquier día en una sola lista — reportado por Sabrina como "sigue mostrando mal los datos de hoy". Se agrega clasificación por las mismas tres ventanas cronológicas que Recordatorios Diarios (`evaluar_bloque_temporal`), manteniendo el contenido rico por ítem (Nombre/Estado/Prioridad/Área/Periodo/Fecha) en vez de volver a conteos agregados. `recordatorios-varios.html` pasa a 3 cards colapsables (Ayer/Hoy/Mañana), reutilizando `toggleBloque()` de `dom_render.js`. Ver `SRS.md` v4.11 — `SRS-FR-M4-402`/`403` reescritos. |
