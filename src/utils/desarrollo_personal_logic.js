/**
 * Lógica pura (sin DOM, sin red) del módulo Desarrollo personal
 * (desarrollo-personal.html), alineada a la BD de Notion "🌱 Desarrollo Personal".
 */

const PILARES_DESARROLLO = [
  "🗣️ Comunicación",
  "💖 Autoestima",
  "🧭 Autoconocimiento",
];

const TIPOS_DESARROLLO = [
  "💬 Conversación",
  "🏆 Logro / Validación",
  "🪞 Reflexión / Disparador",
  "🎯 Valor / Meta",
  "🏋️ Ejercicio práctico",
  "🎥 Video / Masterclass",
  "📖 Lectura / Libro",
];

const ESTADOS_DESARROLLO = [
  "Sin empezar",
  "En curso",
  "Completado",
  "Integrado",
];

function _clasificarPilarKey(pilar) {
  const p = (pilar || "").toLowerCase();
  if (p.includes("comunic")) return "comunicacion";
  if (p.includes("autoestima")) return "autoestima";
  if (p.includes("autoconoc")) return "autoconocimiento";
  return "otros";
}

function calcularResumenDesarrollo(registros) {
  const lista = Array.isArray(registros) ? registros : [];
  const conteos = { comunicacion: 0, autoestima: 0, autoconocimiento: 0 };
  let completados = 0;
  let ejerciciosActivos = 0;
  const puntajes = [];

  lista.forEach((r) => {
    const key = _clasificarPilarKey(r.pilar);
    if (key in conteos) conteos[key] += 1;

    const est = (r.estado || "").toLowerCase();
    if (est.includes("complet") || est.includes("integr")) {
      completados += 1;
    } else if ((r.tipo || "").toLowerCase().includes("ejercicio")) {
      ejerciciosActivos += 1;
    }

    const pt = Number(r.puntaje);
    if (Number.isFinite(pt) && pt > 0) puntajes.push(pt);
  });

  const promedioPuntaje = puntajes.length > 0
    ? Number((puntajes.reduce((a, b) => a + b, 0) / puntajes.length).toFixed(1))
    : null;
  const porcentajeProgreso = lista.length > 0
    ? Math.round((completados / lista.length) * 100)
    : 0;

  return {
    total: lista.length,
    completados,
    porcentajeProgreso,
    ejerciciosActivos,
    promedioPuntaje,
    porPilar: conteos,
  };
}

function construirPayloadDesarrollo(datos) {
  const nombre = (datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "El título es obligatorio." };

  const pilar = (datos.pilar || "").trim() || PILARES_DESARROLLO[0];
  const tipo = (datos.tipo || "").trim() || TIPOS_DESARROLLO[0];
  const estado = (datos.estado || "").trim() || "En curso";
  const fecha = (datos.fecha || "").trim() || null;
  const frecuencia_tecnica = (datos.frecuenciaTecnica || "").trim() || null;
  const nota = (datos.nota || "").trim() || null;

  const ptRaw = datos.puntaje !== "" && datos.puntaje !== null && datos.puntaje !== undefined
    ? Number(datos.puntaje)
    : null;
  if (ptRaw !== null && (!Number.isFinite(ptRaw) || ptRaw < 0 || ptRaw > 100)) {
    return { ok: false, error: "El puntaje debe estar entre 0 y 100." };
  }

  const payload = {
    nombre,
    pilar,
    tipo,
    estado,
    fecha,
    frecuencia_tecnica,
    puntaje: ptRaw,
    recurso_asociado: (datos.recursoAsociado || "").trim() || null,
    enlace: (datos.enlace || "").trim() || null,
    nota,
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PILARES_DESARROLLO,
    TIPOS_DESARROLLO,
    ESTADOS_DESARROLLO,
    calcularResumenDesarrollo,
    construirPayloadDesarrollo,
  };
}
