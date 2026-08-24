# Product Requirements Document (PRD) — Notion Flow Auditor (NFA)

## 📌 1. Información General del Producto
* **Nombre:** Notion Flow Auditor (NFA)
* **Marca Asociada:** Bitácora IT
* **Rol de Gobierno:** IT Functional Analyst (Sabrina) & Mentor Técnico de IA
* **Estado:** Listo para Desarrollo (Base Lineal Validada)
* **Versión:** 4.3
* **Zona Horaria de Referencia:** GMT -3 (San Juan, Argentina)

## 🎯 2. Visión General y Contexto
### 2.1. Propósito
Calcular la consistencia operativa diaria analizando tareas repetitivas en Notion, superando limitaciones visuales con un panel móvil estático optimizado, segmentado cronológicamente (Ayer, Hoy, Mañana), e incorporando un módulo de bienestar y diagnóstico técnico.

### 2.2. Modelo de Arquitectura Híbrida Desacoplada
* **Backend Extractor (Python 3.10):** Daemon invisible (Windows) o asíncrono (GitHub Actions). Procesa vectores analíticos y realiza inyección dinámica de datos (JSON) sobre el archivo `index.html`.
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

## 🎨 5. Estructura de la Interfaz (index.html)
* **Paleta:** Negro azabache, Obsidiana Black, Rojo Toscano, Rojo suave, Clementine Orange.
* **Secciones:** * I: Tareas de ayer.
    * II: Tareas de hoy (Alertas < 70% en Clementine Orange).
    * III: Balance Semanal y Bienestar (Tabla 7 días + Caja de Mentora).
    * V: Panel de Diagnóstico Técnico (Footer: última/próxima sync, volumen de tareas).
    * VI: Navegación (Botón a recordatorios diarios).
* **Fuera de alcance de este módulo:** "Tareas para mañana" (antes Sección IV) no pertenece a Recordatorios Diarios — se implementará como parte del futuro módulo **Recordatorios Varios** (HU ya creada en Notion por Sabrina).
* **Indicador de Versión:** Posicionado abajo a la izquierda (bajo el botón del footer), inyectado vía GitHub Releases (v3.3).

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
| **v4.3** *(Actual)* | Agosto 2026 | Se agregan tests de cron, inyección de versión y cálculo de próxima sincronización — cierra los últimos gaps de la HU "Despliegue Automatizado y Trazabilidad de Versiones". Ver `SRS.md` v4.3. |
