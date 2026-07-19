# 📑 ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS)
## Proyecto: Notion Flow Auditor
**Módulo:** Auditoría de Productividad y Recordatorios Diarios  
**Versión:** 3.3 (Modelo Híbrido, Analítica Semanal y Alerta de Bienestar — Baseline Oficial)  
**Estado:** Validado para Desarrollo y QA  
**Autor:** IT Functional Analyst (Sabrina)  
**Fecha de Emisión:** Julio 2026  

---

## 🛠️ HISTORIAL DE CONTROL DE VERSIONES

| Versión | Fecha | Autor | Descripción del Cambio / Hito Técnico |
| :--- | :--- | :--- | :--- |
| **v1.0** | Junio 2026 | Sabrina Sanso | MVP local inicial: script monolítico en primer plano con bucle `while True` bloqueante (`time.sleep`). |
| **v2.0** | Junio 2026 | Sabrina Sanso | Migración CI/CD Serverless en contenedores virtuales GitHub Actions y normalización binaria de BOM Windows. |
| **v3.3** *(Actual)* | Julio 2026 | Sabrina Sanso | **Baseline Oficial Sincronizada con PRD v3.3:**<br>- Modificación de frecuencia de sincronización invariable a 1 hora (60 minutos).<br>- Delegación estricta del cómputo matemático de métricas y tasas al cliente JavaScript en tiempo real.<br>- Incorporación de la jerarquía de 6 estados ordenada desde "Sin empezar" hasta "Fallida / Vencida".<br>- Adición del Módulo Semanal de Bienestar y Alerta Emocional con persistencia local en caché (`localStorage`).<br>- Reconfiguración del footer de diagnóstico técnico relativo y posicionamiento del campo de versión del release abajo a la izquierda. |

---

## 1. INTRODUCCIÓN

### 1.1 Propósito
Esta Especificación de Requisitos de Software (SRS) define de forma rigurosa y formal los requerimientos de ingeniería para el sistema **Notion Flow Auditor** en su **versión 3.3**. Este documento actúa como la Única Fuente de Verdad (*Single Source of Truth - SSOT*) técnica y operativa, traduciendo las directivas de negocio, diseño y experiencia del usuario del PRD en especificaciones de software verificables y testeables por desarrollo y QA.

### 1.2 Ámbito del Sistema (Scope)
El sistema es una herramienta híbrida y asíncrona de procesamiento de flujos de trabajo de productividad personal. Su función principal consiste en extraer de forma segura datos de una base de datos privada de Notion, estructurar arrays planos JSON en el backend, inyectarlos mediante expresiones regulares en una plantilla estática y delegar la lógica de cálculo métrico, histórico semanal y renderizado adaptivo al cliente web expuesto de forma segura en entornos móviles.

**Componentes del Software:**
* `extract_and_audit.py`: Script extractor backend escrito en Python 3.10 (ejecución headless local o Actions runner).
* `index.html`: Frontend de visualización e interacción construido con Tailwind CSS y Vanilla JavaScript (ECMAScript 6).
* `notion_sync.yml`: Orquestador de Integración y Despliegue Continuo (CI/CD) de GitHub Actions.

### 1.3 Definiciones, Acrónimos y Abreviaturas
* **NFA:** Notion Flow Auditor.
* **ART:** Argentina Time (GMT-3), huso horario de referencia de la analista en San Juan, Argentina.
* **UTC:** Coordinated Universal Time, huso horario utilizado por los servidores y marcas de transacciones cloud.
* **BOM (Byte Order Mark):** Firma binaria en cabeceras de archivos de texto que genera excepciones en compilaciones multiplataforma.
* **SSOT (Single Source of Truth):** Práctica de gobernanza orientada a unificar la lógica del producto en un repositorio/documento central.

### 1.4 Referencias
* Estándar IEEE 830-1998 / ISO/IEC/IEEE 29148 (Ingeniería de Requisitos).
* Product Requirements Document (PRD) v3.3 — Notion Flow Auditor (NFA).
* Manual de Identidad Visual Corporativa Premium (Brand Book Pomelli) — Bitácora IT.

---

## 2. DESCRIPCIÓN GENERAL

### 2.1 Perspectiva del Producto
**Notion Flow Auditor** opera como un sistema de sincronización desacoplado y reactivo de solo lectura. El backend en Python funciona como un cliente asíncrono que extrae la información de Notion en entornos aislados (locales o serverless) y delega el cómputo matemático de métricas y porcentajes en tiempo real al navegador del cliente final, protegiendo los tokens de seguridad de accesos públicos y optimizando la velocidad de carga móvil.

### 2.2 Características de los Usuarios
* **Analista de Productividad (Sabrina Sanso):** Perfil técnico funcional que requiere un acceso inmediato, fluido y mobile-first a sus métricas de consistencia diaria sin lidiar con terminales de comandos interrumpiendo su entorno Windows.

---

## 3. REQUISITOS ESPECÍFICOS

### 3.1 Requisitos Funcionales (FR)

#### Módulo A: Backend, Extracción e Inteligencia de Datos (Python)
* **SRS-FR-M1-101 (Conectividad Segura HTTPS):** El script debe inicializar un socket seguro utilizando TLS 1.3 mediante bloques de contexto `with requests.Session()` para la destrucción inmediata de sockets tras la consulta a los endpoints de la API de Notion.
* **SRS-FR-M1-102 (Clasificación Temporal Algebraica):** El sistema debe calcular algebraicamente mediante objetos nativos `datetime.date` las tres ventanas temporales exactas: Ayer (`hoy - 1`), Hoy (`fecha actual`), y Mañana (`hoy + 1`).
* **SRS-FR-M1-103 (Estructuración y Serialización de Datos):** El backend debe recuperar el universo de registros de Notion, filtrar los ítems bajo la condición lógica `estado == "Hecha" AND consistencia == 1`, y serializar los arrays de datos planos limpios (`conteoAyer`, `conteoHoy`, `conteoManana`) al cliente en formato JSON plano, absteniéndose de precargar totales fijos en el script.
* **SRS-FR-M1-104 (Normalización de Codificación Windows):** El módulo de lectura local debe realizar un análisis binario crudo del archivo `.env` para detectar e interceptar firmas BOM, forzando la sanitización de esquemas complejos (`UTF-16 LE`, `UTF-8-SIG`) generados por PowerShell o entornos Windows.
* **SRS-FR-M1-105 (Gobernanza de Errores Estricta):** Ante cualquier fallo de credenciales (HTTP 401), errores de DNS o caídas del servidor de Notion (HTTP 5xx), el script backend debe capturar de forma controlada la excepción, imprimir un log descriptivo y finalizar con el código de salida estricto `sys.exit(1)`.

#### Módulo B: Orquestación, Pipeline y CD (GitHub Actions)
* **SRS-FR-M2-201 (Detección Condicional de Runtime):** El backend debe evaluar al inicio de la ejecución si la variable `os.getenv("GITHUB_ACTIONS") == "true"`. En caso positivo, desactivará el bucle infinito local para integrarse al ciclo serverless de una única ejecución.
* **SRS-FR-M2-202 (Orquestación del Ciclo de 1 Hora):** El pipeline YAML de sincronización automatizada debe autoinvocarse de forma periódica invariable cada 1 hora (60 minutos) utilizando la sintaxis cron: `0 * * * *`.
* **SRS-FR-M2-203 (Redundancia y Robustez de Secrets):** El flujo YAML implementará compuertas lógicas condicionales (`||`) en su bloque de entorno para capturar secretos ante variaciones comunes de nomenclatura web (mapear de forma segura tanto `NOTION_API_KEY` como `NOTION_TOKEN`).
* **SRS-FR-M2-204 (Trazabilidad de la Versión del Release):** El pipeline de Actions capturará de forma automática el número de tag activo en el repositorio Git e inyectará dicho string en el identificador de pie de página de la interfaz (Ej: `v3.3`).

#### Módulo C: Frontend e Interfaz Móvil (HTML5/Tailwind/JS)
* **SRS-FR-M3-301 (Inyección mediante Regex Tolerantes):** El parser de Python debe actualizar dinámicamente las constantes de JavaScript utilizando expresiones regulares flexibilizadas (`re.sub()`) con comodines de captura tolerantes (`\s*`) para la mutación estática segura de strings en el archivo `index.html`.
* **SRS-FR-M3-302 (Cómputo en Tiempo Real del Cliente):** El motor JavaScript del cliente en el navegador móvil debe calcular dinámicamente en tiempo real los totales de tareas y las Tasas de Consistencia (%) sobre los arrays JSON planos inyectados, aplicando la fórmula: `(Tareas con Estado "Hecha" AND consistencia == 1 / Total de Tareas Creadas en el Día) * 100`.
* **SRS-FR-M3-303 (Estructura Cronológica Tripartita):** La interfaz móvil adaptará su visualización mediante columnas o bloques dinámicos colapsables de Tailwind para renderizar por separado las secciones: I (Tareas de ayer), II (Tareas de hoy) y IV (Tareas para mañana).
* **SRS-FR-M3-304 (Sincronización de Diagnóstico Técnico Relativo):** El panel de diagnóstico técnico del footer expondrá en tipografía secundaria *Inter* las siguientes variables dinámicas:
    1. *Última Sincronización Local:* Fecha y hora exacta convertida a la zona ART (GMT-3).
    2. *Próxima Sincronización (Dynamic ART):* Marca de tiempo calculada dinámicamente sumando estrictamente 1 hora (60 minutos) a la hora de la última sincronización real realizada, prohibiendo horas redondeadas fijas.
    3. *Volumen de Tareas Procesadas:* Total bruto de ítems procesados descargados de la API.
* **SRS-FR-M3-305 (Registro de Cabecera en Formato UTC Fijo):** En la zona superior de la interfaz, inmediatamente al lado del botón interactivo de refresco animado, se renderizará de forma fija la hora de la transacción en formato UTC del servidor: `YYYY-MM-DD HH:mm:ss UTC`.
* **SRS-FR-M3-306 (Módulo Semanal de Bienestar y Alerta Emocional):** El frontend mantendrá un historial en la caché local del navegador (`localStorage`) de las tasas diarias de los últimos 7 días. Si la tasa de consistencia cae por debajo del 70.0% en 4 o más días de la semana actual, se inyectará dinámicamente en el DOM la tarjeta de alerta con el mensaje empático literal: *"Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨"*.
* **SRS-FR-M3-307 (Identificador de Release y Versión):** La interfaz de usuario debe renderizar el string de la versión inyectada en un campo posicionado abajo a la izquierda, alineado exactamente debajo de la base del botón de acción de navegación que redirige a Notion (`Ir a recordatorios diarios`).

---

### 3.2 Requisitos No Funcionales (NFR)

* **SRS-NFR-SEC-001 (Criptografía y Privacidad de Datos):** Queda estrictamente prohibido que cualquier token de autenticación (`ntn_...`) o clave de acceso viaje hacia el navegador móvil o quede expuesto en el código plano estático de `index.html`. El archivo `.env` debe estar listado obligatoriamente en el `.gitignore` y las credenciales se inyectarán exclusivamente vía **GitHub Secrets**.
* **SRS-NFR-PERF-002 (Eficiencia de Recursos del Runtime):** El Daemon local en segundo plano ejecutado en Windows debe operar de forma invisible (headless, ocultando la consola CMD) consumiendo menos del 2% de CPU y un máximo de 50 MB de memoria RAM.
* **SRS-NFR-USE-003 (Diseño de Identidad Visual de Alto Contraste Pomelli):** Los componentes visuales y widgets dinámicos del dashboard deben apegarse estrictamente a la paleta industrial del manual de marca: Negro azabache (`#08080A`), Obsidiana Black (`#111115`), acentos en Rojo Toscano (`#B91C1C`) / Rojo suave (`#EF4444`).
* **SRS-NFR-USE-004 (Frecuencia Invariable e Impacto Métrico):** Toda sincronización de infraestructura local o cloud se ejecutará invariablemente cada 1 hora (60 minutos) de forma automatizada. Si el cómputo dinámico de hoy cae por debajo del umbral del 70.0%, la tarjeta del KPI principal cambia su acento visual de forma automática a color Clementine Orange (`#F59E0B`).
* **SRS-NFR-PERF-005 (Rendimiento Web Móvil):** El dashboard estático alojado en **GitHub Pages** debe cargarse en menos de 1.5 segundos en conexiones móviles 4G/5G, manteniendo la interfaz optimizada para pantallas verticales de teléfonos celulares mediante rejillas colapsables de Tailwind.

---

## 4. CRITERIOS DE ACEPTACIÓN CORE (ENFOQUE BDD)

### SRS-BDD-001: Automatización del Ciclo de 1 Hora y Alerta de Bienestar
* **Dado que** el Daemon invisible de Windows o el Actions container finalizó una sincronización exitosa a las `14:00 (ART / GMT-3)`.
* **Y** el sistema ha calculado en su caché de `localStorage` semanal que el usuario acumuló 4 días con tasas de rendimiento inferiores al umbral recomendado del 70.0%.
* **Cuando** el reloj del sistema llega a las `15:00 (ART / GMT-3)`.
* **Entonces** la infraestructura automatizada debe despertar, procesar los datos de Notion y publicar el `index.html` en GitHub Pages cumpliendo con:
    1. Calcular de forma relativa la Próxima Actualización y renderizar en el footer exactamente: `16:00 ART` (Última Sincronización Local + 1 hora).
    2. Habilitar en la sección III de "Balance Semanal" la tabla dinámica con el historial y desplegar de forma visible la caja con el mensaje de bienestar literal: *"Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨"*.
    3. Mostrar en la zona superior de la interfaz, de forma fija al lado del botón de refresco animado, la hora exacta en formato UTC del servidor: `YYYY-MM-DD 18:00:00 UTC`.
    4. Mostrar abajo a la izquierda, exactamente debajo de la base del botón del footer, la etiqueta de versión de release `v3.3`.
    5. Mapear y agrupar el panel de distribución cuantitativo de la sección de hoy respetando el orden jerárquico estricto: *1. Sin empezar, 2. En ejecución, 3. Hecha por otra persona, 4. No necesaria, 5. Hecha, 6. Fallida / Vencida*, aplicando el color *Clementine Orange (#F59E0B)* en el KPI de hoy por estar por debajo del umbral mínimo de consistencia.