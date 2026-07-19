# Product Requirements Document (PRD) — Notion Flow Auditor (NFA)

## 📌 1. Información General del Producto
* **Nombre:** Notion Flow Auditor (NFA)
* **Marca Asociada:** Bitácora IT
* **Rol de Gobierno:** IT Functional Analyst (Sabrina) & Mentor Técnico de IA
* **Estado:** Listo para Desarrollo (Base Lineal Validada)
* **Versión:** 3.3
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
    * IV: Tareas para mañana (Título y Prioridad).
    * V: Panel de Diagnóstico Técnico (Footer: última/próxima sync, volumen de tareas).
    * VI: Navegación (Botón a recordatorios diarios).
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