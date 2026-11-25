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

const FORMATOS_RECURSO_VUELO = [
  "🎧 Podcast / Audio",
  "📖 Libro",
  "🎥 Video / Taller",
  "📄 Paper Científico",
  "🔗 Artículo / Web",
];

function construirRecursoEnVuelo(datos) {
  const titulo = (datos && datos.titulo ? String(datos.titulo) : "").trim();
  if (!titulo) {
    return { ok: false, error: "El título del recurso es obligatorio." };
  }
  const formato = (datos.formato || "").trim() || FORMATOS_RECURSO_VUELO[0];
  const autor = (datos.autor || "").trim() || null;
  const url = (datos.url || "").trim() || null;
  if (url && !/^https?:\/\/\S+/i.test(url)) {
    return { ok: false, error: "La URL debe comenzar con http:// o https://." };
  }
  const tags = (datos.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const etiquetaCatalogo = autor ? `${titulo} (${autor})` : titulo;
  return {
    ok: true,
    recurso: {
      titulo,
      formato,
      autor,
      url,
      tags,
      etiquetaCatalogo,
    },
  };
}

function agregarRecursoACatalogo(catalogo, etiqueta) {
  const lista = Array.isArray(catalogo) ? [...catalogo] : [];
  const val = (etiqueta || "").trim();
  if (!val) return lista;
  const existe = lista.some((item) => String(item).trim().toLowerCase() === val.toLowerCase());
  if (!existe) lista.unshift(val);
  return lista;
}

function analizarImpactoEliminacionDesarrollo(registro, todosLosRegistros) {
  if (!registro) return { tieneRecurso: false, recurso: null, vinculosRelacionados: [] };
  const recurso = (registro.recurso_asociado || "").trim() || null;
  const lista = Array.isArray(todosLosRegistros) ? todosLosRegistros : [];
  const vinculosRelacionados = recurso
    ? lista.filter((r) => r && r.id !== registro.id && (r.recurso_asociado || "").trim().toLowerCase() === recurso.toLowerCase())
    : [];
  return {
    tieneRecurso: Boolean(recurso),
    recurso,
    vinculosRelacionados,
  };
}

function crearSnapshotRollback(registro, diasGracia = 30, ahoraMs = Date.now()) {
  if (!registro || !registro.nombre) return null;
  const msGracia = Math.max(1, Number(diasGracia) || 30) * 86400000;
  return {
    id: registro.id || null,
    nombre: registro.nombre,
    pilar: registro.pilar || PILARES_DESARROLLO[0],
    tipo: registro.tipo || TIPOS_DESARROLLO[0],
    estado: registro.estado || "En curso",
    fecha: registro.fecha || null,
    frecuencia_tecnica: registro.frecuencia_tecnica || null,
    puntaje: registro.puntaje ?? null,
    recurso_asociado: registro.recurso_asociado || null,
    enlace: registro.enlace || null,
    nota: registro.nota || null,
    eliminadoEnISO: new Date(ahoraMs).toISOString(),
    expiraEnISO: new Date(ahoraMs + msGracia).toISOString(),
  };
}

function filtrarSnapshotsVigentes(snapshots, ahoraMs = Date.now()) {
  if (!Array.isArray(snapshots)) return [];
  return snapshots.filter((s) => {
    if (!s || !s.expiraEnISO) return false;
    const expMs = Date.parse(s.expiraEnISO);
    return !Number.isNaN(expMs) && expMs > ahoraMs;
  });
}

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
    FORMATOS_RECURSO_VUELO,
    calcularResumenDesarrollo,
    construirPayloadDesarrollo,
    construirRecursoEnVuelo,
    agregarRecursoACatalogo,
    analizarImpactoEliminacionDesarrollo,
    crearSnapshotRollback,
    filtrarSnapshotsVigentes,
  };
}
