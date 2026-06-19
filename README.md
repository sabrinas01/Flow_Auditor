#🛡️ Notion Flow Auditor
¡Bienvenido a Notion Flow Auditor! Este es un microservicio local de auditoría y visualización de consistencia diaria, diseñado para extraer datos en tiempo real de tu base de datos de Notion, procesar tus hábitos bajo reglas de negocio estrictas y proyectarlos en un dashboard interactivo de alta fidelidad visual.
Desarrollado con un enfoque de seguridad por diseño (security by design), este sistema protege tus credenciales privadas mediante aislamiento de entorno y garantiza conexiones de red herméticas.

#🎨 Características Clave

*Diseño Premium "Human-Tech": Interfaz web moderna basada en negros profundos y acentos en tonos borgoña/vino, optimizada para ofrecer una experiencia visual relajante y profesional.

*Lógica de Consistencia Estricta: Evalúa tus registros diarios mediante un filtro compuesto AND (el estado de la tarea debe ser exactamente "Hecha" y la propiedad "Consistencia" debe ser igual a 1).

*Mapeo Dinámico de Estados: Agrupa y contabiliza automáticamente el estado real de tus recordatorios diarios en barras de progreso proporcionales.

*Escala Autocalibrable: El dashboard adapta dinámicamente sus rangos, marcas, slider de pruebas y alertas de rendimiento (umbral del 70%) al volumen real de tareas extraídas por el motor (procesando correctamente desde 1 hasta 13 o más tareas).

*Robustez ante Windows: Backend equipado con un decodificador binario inteligente que neutraliza corrupciones de codificación (UTF-16 LE, BOM) introducidas accidentalmente al crear archivos en PowerShell.

*Cierre Seguro de Conexiones: Uso de administradores de sesiones HTTP (requests.Session) para asegurar que las conexiones TLS 1.3 con la API de Notion se destruyan inmediatamente tras completar cada ciclo.

#Diseñado y desarrollado con pasión por:
Hecho por bitacorait By Sabry 🚀
Mentoría técnica de ciberseguridad y desarrollo: Tu Coach de Programación(Prompt de Gemini)