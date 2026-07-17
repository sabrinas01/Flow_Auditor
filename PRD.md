# Product Requirements Document (PRD) — Notion Flow Auditor

---

## 📌 1. Información General del Producto

- **Nombre del Producto:** Notion Flow Auditor (NFA)
- **Marca Asociada:** Bitácora IT
- **Rol de Gobierno:** IT Functional Analyst (Sabrina) & Mentor Técnico de IA
- **Estado:** Listo para Desarrollo (Base Lineal Validada)
- **Versión:** 3.3 (Modelo Híbrido, Seguridad, Analítica Semanal, Sincronización Relativa de 1h y Alerta de Bienestar)
- **Zona Horaria de Referencia:** GMT -3 (San Juan, Argentina)

---

## 🎯 2. Visión General y Contexto

### 2.1. Propósito del Producto

Notion Flow Auditor es un cuadro de mando analítico de productividad personal y de control de procesos, diseñado para superar las limitaciones de visualización nativa que posee la interfaz de Notion. Su objetivo principal es calcular la consistencia operativa diaria analizando tareas repetitivas mediante una fórmula lógica compuesta, exponiendo las métricas en un panel móvil estático optimizado, segmentado cronológicamente en tres ventanas (Tareas de ayer, Tareas de hoy y Tareas para mañana), incorporando un módulo de salud mental / balance operativo semanal y diagnóstico técnico de infraestructura.

### 2.2. Modelo de Arquitectura Híbrida Desacoplada

El sistema opera bajo un flujo híbrido seguro:

**Backend Extractor (Python 3.10):** Se ejecuta localmente de forma invisible (modo headless / Daemon) o de forma serverless en un contenedor virtual asíncrono (ubuntu-latest en GitHub Actions). Descifra de forma segura las credenciales inyectadas (.env local o variables secretas de repositorio), consulta la API de Notion mediante llamadas HTTPS directas y procesa los vectores analíticos.

**Inyección Dinámica de Datos:** Python procesa los datos y reescribe mediante expresiones regulares de sustitución tolerantes a espacios (s*) variables globales en formato JSON plano directo en el archivo de interfaz index.html.

**Frontend Responsivo (HTML5/Tailwind CSS/JS):** Alojado de forma privada/pública en GitHub Pages. Asume la lógica de cómputo matemático en tiempo real, procesando los arrays dinámicos directamente en el navegador del dispositivo móvil del usuario para evitar desajustes o datos fijos congelados.

---

## 👥 3. Personas y Usuarios

### 3.1. Usuario Único (Analista de Flujo Personal)

**Perfil:** Sabrina, IT Functional Analyst en Bitácora IT.

**Necesidades Clave:**

- Monitorear de forma visual, centralizada y ágil la cantidad de tareas completadas frente al total de tareas diarias planificadas en Notion.
- Evitar la distracción de consolas de comandos o CMDs interrumpiendo su flujo de trabajo en Windows.
- Visualizar con un diseño móvil pulido y con altos estándares estéticos los resultados desde cualquier red móvil.
- Recibir alertas empáticas para balancear su carga laboral diaria y evitar el desgaste (burnout).

---

## ⚙️ 4. Alcance Funcional y Lógica de Negocio

### 4.1. Regla de Cálculo de la Tasa de Consistencia / Completitud Diaria

Para los bloques cronológicos de evaluación de consistencia, la fórmula aplicada para calcular el porcentaje de éxito diario se define de manera estricta como:

Tasa de Consistencia (%) = (Tareas con Estado "Hecha" AND Fórmula "consistencia" = 1 / Total de Tareas Creadas en el Día) x 100

Esta condición lógica combinada (AND) asegura que únicamente las tareas completadas que cumplan con la regla de negocio interna de consistencia sean contabilizadas como victorias reales.

### 4.2. Mapeo, Jerarquía y Distribución de Estados de Notion

En el panel de distribución del día en curso, el sistema debe agrupar y contar el volumen de tareas basándose exclusivamente en los estados configurados en la base de datos de Notion, presentándolos en la interfaz gráfica en un orden de prioridad visual invariable:

- Sin empezar
- En ejecución
- Hecha por otra persona
- No necesaria
- Hecha
- Fallida / Vencida

### 4.3. Módulo de Rendimiento Semanal y Alerta de Bienestar (Módulo Emocional)

**Persistencia Histórica:** El sistema debe cachear/guardar localmente en el cliente los porcentajes diarios correspondientes a los últimos 7 días de operación para alimentar una tabla semanal dinámica.

**Regla Lógica de Carga de Trabajo:** Se evaluará la cantidad de días de la semana actual que registraron una Tasa de Consistencia estrictamente menor al 70.0%.

**Condicional de Alerta Mental (>= 4 días):** Si el contador de días con baja consistencia cumple con la condición de ser igual o mayor a 4 días, la interfaz del dashboard debe desplegar de manera destacada y prioritaria una tarjeta de alerta con el siguiente mensaje:

> "Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨"
> 

---

## 🎨 5. Estructura de la Interfaz (index.html)

El diseño del dashboard sigue los lineamientos del Manual de Identidad Visual Corporativa Premium (Brand Book Pomelli):

**Tipografías:**

- Inter (primaria, para jerarquía de KPIs e indicadores core)
- Roboto (secundaria, para listados y desgloses secundarios)

**Paleta de Colores:**

- Fondo de pantalla: Negro azabache (#08080A)
- Tarjetas de bloque (cards): Obsidiana Black (#111115)
- Indicadores de estado principales: Rojo Toscano (#B91C1C)
- Efectos interactivos y botones: Rojo suave (#EF4444)
- Métricas críticas / Advertencia por debajo del 70%: Clementine Orange (#F59E0B)

### 5.1. Cabecera (Header de Control)

- **Botón "Actualizar Dashboard":** Gatilla una animación de giro del icono de refresco y bloquea la interacción por 1.2 segundos mientras recarga de forma limpia los datos del navegador.
- **Última Sincronización del Servidor (UTC):** Al lado del botón de actualización, se muestra la marca temporal del runtime del servidor en formato estrictamente estandarizado: YYYY-MM-DD HH:mm:ss UTC.

### 5.2. Sección I: Tareas de ayer

- **Métricas Cuantitativas:** Contador total de tareas creadas ayer y total de tareas completadas ayer.
- **Indicador Clave:** Renderizado destacado de la Tasa de Consistencia de Ayer (%) en color de la marca.

### 5.3. Sección II: Tareas de hoy

- **Métricas Cuantitativas:** Contador total de tareas creadas hoy y total de tareas completadas hoy.
- **Indicador Clave:** Renderizado de la Tasa de Consistencia de Hoy (%).
- **Panel de Distribución:** Tarjetas de bloque visual con el recuento cuantitativo por estado de Notion, ordenadas de forma rígida desde Sin empezar hasta Fallida / Vencida.
- **Sistema de Alerta de Consistencia:** Si el cómputo dinámico de hoy cae por debajo del 70.0%, la tarjeta del KPI principal cambia su acento visual a color Clementine Orange.

### 5.4. Sección III: Balance Semanal y Bienestar

- **Tabla de Rendimiento Semanal:** Desglose dinámico de los últimos 7 días con su tasa de completitud asociada.
- **Caja de Bienestar de la Mentora:** Bloque de notificación dinámico que renderiza el mensaje literal de la mentora con emojis si y solo si se cumple la condición de >= 4 días por debajo del 70.0%.

### 5.5. Sección IV: Tareas para mañana

- **Listado de Anticipación:** Muestra la lista de compromisos configurados para el día siguiente.
- **Atributos de ítem:** Cada fila de tarea expone únicamente el Título y la Prioridad del registro.

### 5.6. Sección V: Panel de Diagnóstico Técnico (Footer de Control)

Ubicado de forma compacta en el pie de página con tipografía Roboto reducida:

- **Última Sincronización Local:** Fecha y hora exacta del último procesamiento exitoso, convertida a la zona local de la analista (GMT -3).
- **Próxima Sincronización (Regla Dinámica Relativa):** Fecha y hora estimada de la próxima ejecución automática. Se calcula sumando exactamente 1 hora (60 minutos) a la marca de tiempo de la última sincronización real realizada, eliminando cualquier redondeo a la hora en punto.
- **Volumen de Tareas:** Cantidad bruta de registros descargados y analizados. (Se eliminó el contador de peticiones acumuladas de la API).

### 5.7. Sección VI: Navegación de Cierre y Trazabilidad

- **Botón de Acción "Ir a recordatorios diarios":** Elemento de interacción fijo centrado que redirige al espacio de trabajo de Notion. URL: [Mis Recordatorios varios V0](https://app.notion.com/p/858a38bb7a6e83f993ab81719a72e505?pvs=21)
- **Indicador de Versión GitHub Release:** Campo posicionado abajo de todo, alineado a la izquierda, exactamente debajo de la base del botón, que renderiza la versión inyectada dinámicamente desde el tag del release de GitHub (Ej. v3.3).

---

## 🔒 6. Requerimientos No Funcionales (RNF)

- **RNF-01 (Seguridad - Crítico):** Las credenciales de acceso de las variables de entorno (NOTION_TOKEN / NOTION_API_KEY y DATABASE_ID) son estrictamente de procesamiento del backend local o memoria volátil en la nube. Ningún token debe guardarse en código plano en el HTML ni subirse al repositorio. El archivo .env debe listarse mandatoriamente en el .gitignore.
- **RNF-02 (Rendimiento y Consumo Local):** El Daemon en segundo plano ejecutado en Windows debe operar en modo invisible (headless, ocultando las consolas CMD) y consumir menos del 2% de CPU y un máximo de 50 MB de memoria RAM.
- **RNF-03 (Frecuencia de Sincronización):** El Daemon local o el disparador programado de GitHub Actions debe despertar, procesar la información y publicar el nuevo index.html de manera invariable cada 1 hora (60 minutos).
- **RNF-04 (Rendimiento Web):** El dashboard estático alojado en GitHub Pages debe cargarse en menos de 1.5 segundos en conexiones móviles 4G/5G.

---

## 🚫 7. Fuera de Alcance (Out of Scope)

- Modificación, edición, borrado o escritura de registros sobre la base de datos de Notion (la integración es 100% de solo lectura y auditoría).
- Autenticación de usuarios vía OAuth2 en la interfaz web (se mantiene el modelo de inyección híbrido).
- Soporte oficial y empaquetado invisible del Daemon para sistemas operativos macOS o Linux (foco exclusivo en Windows y pipeline serverless en Linux Actions).

---

## 🧪 8. Criterio de Aceptación Core (Enfoque BDD)

**Escenario: Activación de Alerta de Bienestar e Inyección del Release**

**Dado** que el Daemon invisible de Windows ha terminado un ciclo de sincronización exitoso a las 16:15:30 (GMT-3) tras cumplirse el intervalo de 1 hora.

**Y** el sistema ha calculado en su caché semanal que el usuario acumuló 4 días con tasas de completitud inferiores al umbral del 70.0%.

**Cuando** el orquestador compila e inyecta dinámicamente la información del release de GitHub v3.3 y actualiza el archivo index.html en GitHub Pages.

**Entonces** el dashboard renderizado en el navegador móvil debe:

1. Mostrar en la cabecera superior la hora exacta de la compilación en formato UTC del servidor al lado de un botón "Actualizar Dashboard" animado.
2. Calcular de forma relativa la Próxima Actualización y renderizar en el footer exactamente: 17:15:30 ART (Sincronización Local + 1 hora).
3. Habilitar en el bloque de "Balance Semanal" la tabla dinámica con el historial y desplegar de forma visible la caja con el mensaje literal de la mentora: "Linda, es momento de ajustar prioridades y analizar si son necesarias tantas tareas. No seas dura contigo, cielo. 🧠✨".
4. Mostrar abajo a la izquierda, debajo de la base del botón del footer, la versión inyectada dinámicamente (v3.3).
5. Mapear y agrupar el panel de distribución cuantitativo de hoy respetando el orden jerárquico que inicia en Sin empezar y concluye en Fallida / Vencida.
