# Software Requirements Specification (SRS) — Notion Flow Auditor

---

## 1. Introducción

### 1.1 Propósito

Esta Especificación de Requisitos de Software (SRS) define de forma rigurosa y formal los requerimientos de ingeniería para el sistema Notion Flow Auditor en su versión 3.3. Este documento actúa como la Única Fuente de Verdad (Single Source of Truth - SSOT) técnica y operativa, vinculando las lógicas de negocio procesadas por el backend de Python con el comportamiento interactivo del cliente HTML5 alojado de forma serverless.

### 1.2 Ámbito del Sistema (Scope)

El sistema es una herramienta híbrida y asíncrona de procesamiento de flujos de trabajo. Su función es extraer registros temporales de tareas de productividad desde los endpoints de Notion, estructurar y normalizar los datos, inyectarlos en una interfaz optimizada para dispositivos móviles mediante un motor de sustitución de expresiones regulares y desplegar el resultado de forma estática y segura.

**Componentes del Software:**

- `extract_and_audit.py` (Script extractor backend de Python 3.10)
- `index.html` (Frontend de visualización e interacción construido con Tailwind CSS y Vanilla JS)
- `notion_sync.yml` (Orquestador CI/CD de GitHub Actions)

### 1.3 Definiciones, Acrónimos y Abreviaturas

- **NFA:** Notion Flow Auditor.
- **ART:** Argentina Time (GMT-3), huso horario local de la analista en San Juan, Argentina.
- **UTC:** Coordinated Universal Time, huso horario utilizado para los logs y auditoría del contenedor virtual.
- **BOM (Byte Order Mark):** Marca de orden de bytes de codificación que produce excepciones sintácticas en compilaciones multiplataforma.
- **SSOT (Single Source of Truth):** Práctica de mantener la rama raíz (main) libre de bifurcaciones de código asíncronas para asegurar la integridad operativa.

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

Notion Flow Auditor opera como un sistema de sincronización desacoplado y reactivo. El backend de Python actúa como un cliente de solo lectura hacia los servidores API de Notion. El procesamiento pesado de red se realiza de manera remota/local a intervalos definidos, limitándose a exportar estructuras estáticas para que la lógica de renderizado y cómputo de consistencia sea delegada al motor Javascript del navegador web cliente, aislando las credenciales críticas de cualquier entorno de ejecución público.

### 2.2 Características de los Usuarios

**Analista de Productividad (Sabrina):** Perfil técnico funcional. Requiere una interfaz de carga ultrarrápida, de diseño minimalista industrial y con visualización sin intervención manual de terminales.

---

## 3. Requisitos Específicos

### 3.1 Requisitos Funcionales (FR)

#### Módulo A: Backend, Extracción e Inteligencia de Datos (Python)

- **SRS-FR-M1-101 (Conectividad Segura HTTPS):** El script debe inicializar un socket de comunicación seguro utilizando HTTPS TLS 1.3 mediante el bloque de contexto `with requests.Session()`.
- **SRS-FR-M1-102 (Clasificación Temporal Algebraica):** El sistema debe calcular algebraicamente mediante objetos `datetime.date` las ventanas correspondientes: Ayer, Hoy, Mañana.
- **SRS-FR-M1-103 (Cálculo de Consistencia de Tareas):** El backend debe recuperar el universo de registros, filtrar los ítems que tengan el estado exacto de "Hecha" AND cuya propiedad de Notion `consistencia` sea igual a 1, e inyectar por separado los arrays de conteo acumulado y totales al cliente en formato JSON plano: `conteoAyer`, `conteoHoy`, `conteoManana`.
- **SRS-FR-M1-104 (Normalización de Codificación):** El módulo de lectura local del archivo `.env` debe realizar un análisis binario crudo para detectar e interceptar marcas de orden de bytes (BOM) en Windows.
- **SRS-FR-M1-105 (Gobernanza de Errores Estricta):** Ante cualquier fallo de credenciales (HTTP 401), problemas de DNS o caídas de servidor (HTTP 5xx), el script debe capturar la excepción y finalizar con un código de salida estricto `sys.exit(1)`.

#### Módulo B: Orquestación, Pipeline y CD (GitHub Actions)

- **SRS-FR-M2-201 (Detección Condicional de Runtime):** El backend evaluará al inicio de la ejecución si existe la variable de entorno `GITHUB_ACTIONS == "true"`. En caso positivo, desactivará el bucle infinito local.
- **SRS-FR-M2-202 (Orquestación del Ciclo de 1 Hora):** El pipeline YAML de sincronización automática se autoinvocará de forma periódica invariable cada 1 hora (60 minutos) utilizando la sintaxis de cron programado: `0 * * * *`.
- **SRS-FR-M2-203 (Redundancia y Robustez de Secrets):** El flujo YAML implementará compuertas lógicas condicionales (`||`) en su bloque de entorno para capturar de forma resiliente variables como `NOTION_API_KEY` y `NOTION_TOKEN`.
- **SRS-FR-M2-204 (Trazabilidad de la Versión del Release):** El proceso de compilación del pipeline de Actions capturará de forma automática el número de tag activo en el repositorio e inyectará dicho string en el pie de página de la interfaz (Ej: v5.4).

#### Módulo C: Frontend e Interfaz Móvil (HTML5/Tailwind/JS)

- **SRS-FR-M3-301 (Inyección mediante Regex Tolerantes):** El parser de Python debe actualizar dinámicamente las constantes de Javascript utilizando expresiones regulares robustas flexibilizadas que toleren espacios en blanco y tabulaciones invisibles.
- **SRS-FR-M3-302 (Cómputo en Tiempo Real del Cliente):** El cliente JavaScript en el celular del usuario procesará los arrays dinámicos JSON inyectados, calculando automáticamente la Tasa de Consistencia de Ayer y de Hoy (%).
- **SRS-FR-M3-303 (Estructura de Tres Secciones Cronológicas):** La interfaz móvil adaptará su visualización mediante columnas dinámicas colapsables para renderizar por separado: Tareas de ayer, Tareas de hoy y Tareas para mañana.
- **SRS-FR-M3-304 (Sincronización de Diagnóstico Técnico Relativo):** El panel de diagnóstico técnico del footer expondrá en tipografía secundaria Inter las siguientes variables dinámicas:
    1. **Última Sincronización Local:** ART (GMT-3).
    2. **Próxima Sincronización (Dynamic ART):** Marca de tiempo calculada dinámicamente sumando estrictamente 1 hora (60 minutos) a la hora en que ocurrió la última sincronización local real de datos. Queda estrictamente prohibida la inyección de horas redondeadas fijas.
    3. **Volumen de Tareas Procesadas:** Total de ítems procesados. (Se elimina el contador de peticiones acumuladas de la API).
- **SRS-FR-M3-305 (Registro de Cabecera en Formato UTC):** En la zona superior, de forma inmediata al lado de un botón interactivo de refresco animado, se renderizará de forma fija la hora de la transacción en estricto formato UTC del servidor: `YYYY-MM-DD HH:mm:ss UTC`.
- **SRS-FR-M3-306 (Módulo Semanal de Bienestar y Alerta Emocional):** El frontend mantendrá un histórico local de las tasas de consistencia diarias calculadas para los últimos 7 días en una tabla estructurada de desglose semanal. Si la tasa de consistencia cae por debajo del 70.0% en 4 o más días, se inyectará dinámicamente en el DOM la tarjeta de alerta con el mensaje empático literal: "Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨"

### 3.2 Requisitos No Funcionales (NFR)

- **SRS-NFR-SEC-001 (Criptografía y Privacidad de Datos):** Queda estrictamente prohibido que cualquier token de autenticación (`ntn_...`) o clave de acceso viaje hacia el navegador móvil o quede expuesto en el código plano estático de `index.html`.
- **SRS-NFR-PERF-002 (Cierre Hermético de Sockets TCP):** El backend de Python debe liberar inmediatamente los sockets y recursos de red asociados a la comunicación HTTPS con los servidores de Notion tras la finalización de la consulta.
- **SRS-NFR-USE-003 (Diseño de Identidad Visual Premium de Alto Contraste):** Los componentes visuales y widgets dinámicos del dashboard deben apegarse estrictamente a la paleta industrial del manual de marca de Bitácora IT: Negro azabache `#08080A`, Obsidiana Black `#111115`, acentos en Rojo Toscano `#B91C1C` / Rojo suave `#EF4444`, y alertas de advertencia en Clementine Orange `#F59E0B`.
- **SRS-NFR-USE-004 (Frecuencia Invariable):** Toda sincronización de infraestructura cloud se programará y ejecutará invariablemente cada 1 hora (60 minutos) de forma automatizada.
