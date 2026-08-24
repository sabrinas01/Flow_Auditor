/**
 * Lógica de cálculo pura del dashboard (vanilla JS, sin bundler — se carga con <script>).
 * Separada de index.html para poder testearla con Jest sin necesitar un DOM real.
 * Las funciones acá NO tocan el DOM ni localStorage: reciben datos, devuelven datos.
 */

/**
 * Escapa caracteres HTML especiales antes de interpolar texto (p.ej. nombres de
 * estado provenientes de Notion) dentro de innerHTML, para prevenir XSS.
 */
function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Determina dinámicamente si el estado indica una tarea completada.
 */
function esEstadoCompletado(estado) {
  const norm = estado.toLowerCase();
  return norm.includes("hecha") || norm.includes("hecho") || norm.includes("completad") || norm.includes("done");
}

/**
 * Asigna el estilo (pill de color + ícono opcional) del Design System "Obsidian Refined"
 * según la categoría semántica del estado.
 */
function obtenerEstiloEstado(estado) {
  const norm = estado.toLowerCase();
  if (esEstadoCompletado(estado)) {
    return { pill: "left-pill-green", textClass: "text-[#53a759] font-semibold", icon: null, iconClass: "" };
  }
  if (norm.includes("fallida") || norm.includes("vencida") || norm.includes("fail") || norm.includes("perd")) {
    return { pill: "left-pill-red", textClass: "text-[#ff5f52] font-bold", icon: "close", iconClass: "text-[#ff5f52]" };
  }
  if (norm.includes("no neces") || norm.includes("saltad") || norm.includes("skip")) {
    return { pill: "left-pill-blue", textClass: "text-on-surface font-semibold", icon: "fast_forward", iconClass: "text-white" };
  }
  if (norm.includes("ejecu") || norm.includes("progr") || norm.includes("haciendo")) {
    return { pill: "left-pill-blue", textClass: "text-on-surface font-semibold", icon: "hourglass_top", iconClass: "text-white" };
  }
  return { pill: "left-pill-blue", textClass: "text-on-surface font-semibold", icon: null, iconClass: "" };
}

/**
 * Determina la posición de un estado en la jerarquía fija del PRD/SRS:
 * 1. Sin empezar | 2. En ejecución | 3. Hecha por otra persona |
 * 4. No necesaria | 5. Hecha | 6. Fallida / Vencida.
 * Un estado que no matchea ninguna categoría queda al final (rank 99).
 */
function rankEstado(estado) {
  const norm = estado.toLowerCase();
  if (norm.includes("sin empezar")) return 1;
  if (norm.includes("ejecu") || norm.includes("progr") || norm.includes("haciendo")) return 2;
  if (norm.includes("hecha") && norm.includes("otra")) return 3; // "Hecha por otra persona"
  if (norm.includes("no neces") || norm.includes("saltad") || norm.includes("skip")) return 4;
  if (esEstadoCompletado(estado)) return 5; // "Hecha" genérico (ya se descartó el caso "otra persona" arriba)
  if (norm.includes("fallida") || norm.includes("vencida") || norm.includes("fail") || norm.includes("perd")) return 6;
  return 99;
}

/**
 * Ordena las entradas [estado, cantidad] de un diccionario respetando la jerarquía
 * fija de rankEstado(). Estados con el mismo rank (o desconocidos) mantienen su
 * orden relativo original (sort estable).
 */
function ordenarEntradasPorJerarquia(data) {
  return Object.entries(data)
    .map((entrada, index) => ({ entrada, index, rank: rankEstado(entrada[0]) }))
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index))
    .map(({ entrada }) => entrada);
}

/**
 * Calcula el total, las completadas, la tasa de consistencia (%) y si corresponde
 * mostrar alerta, a partir de un diccionario {estado: cantidad}. Umbral: 70% (SRS).
 */
function calcularMetricas(data) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  let hechas = 0;
  Object.entries(data).forEach(([estado, cantidad]) => {
    if (esEstadoCompletado(estado)) hechas += cantidad;
  });

  const tasa = total > 0 ? (hechas / total * 100.0) : 0.0;
  const consistenciaOk = tasa >= 70.0 || total === 0;
  const alerta = tasa < 70.0 && total > 0;

  return { total, hechas, tasa, consistenciaOk, alerta };
}

/**
 * Genera las 7 fechas naturales consecutivas terminando en fechaHoyStr ("DD/MM/YYYY"),
 * de más reciente a más antigua. No depende de qué fechas existan en caché, para no
 * dejar huecos cuando el dashboard no se abre todos los días.
 */
function generarUltimos7Dias(fechaHoyStr) {
  const [diaHoy, mesHoy, anioHoy] = fechaHoyStr.split("/").map(Number);
  const hoyDate = new Date(anioHoy, mesHoy - 1, diaHoy);

  const dias = [];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(hoyDate);
    fecha.setDate(fecha.getDate() - i);
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    dias.push(`${dd}/${mm}/${fecha.getFullYear()}`);
  }
  return dias;
}

/**
 * Clasifica cada uno de los últimos 7 días contra la caché semanal y cuenta cuántos
 * días cayeron por debajo del 70% (umbral de la Alerta de Bienestar, SRS-FR-M3-306).
 */
function calcularResumenSemanal(cache, ultimos7Dias) {
  let diasBajosCount = 0;

  const filas = ultimos7Dias.map((key) => {
    const tieneDato = Object.prototype.hasOwnProperty.call(cache, key);
    const value = tieneDato ? cache[key] : null;
    if (tieneDato && value < 70.0) diasBajosCount++;
    return { key, tieneDato, value };
  });

  return { filas, diasBajosCount, mostrarAlerta: diasBajosCount >= 4 };
}

// CommonJS opcional (para tests con Jest/Node) sin afectar el uso como <script> global.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    escapeHtml,
    esEstadoCompletado,
    obtenerEstiloEstado,
    rankEstado,
    ordenarEntradasPorJerarquia,
    calcularMetricas,
    generarUltimos7Dias,
    calcularResumenSemanal,
  };
}
