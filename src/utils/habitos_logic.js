/**
 * Lógica pura (sin DOM, sin red) del módulo Hábitos y disciplina
 * (habitos-y-disciplina.html), conectado a la BD de Notion "🔥 Hábitos y Disciplina".
 */

const MODULOS_HABITOS = ["🔥 Hábito", "🎓 Formación / Curso"];
const ESTADOS_FORMACION = ["Sin empezar", "En curso", "En pausa", "Terminado"];
const ESTADOS_HABITOS_ALL = ["Activo", ...ESTADOS_FORMACION];
const CATEGORIAS_HABITOS = [
  "🌅 Mañana",
  "🌙 Noche",
  "🧠 Mente & Foco",
  "💪 Cuerpo & Salud",
  "💼 Carrera & Tech",
];

function calcularResumenHabitos(items, formacionesSeparadas) {
  const lista = Array.isArray(items) ? items : [];
  const habitos = Array.isArray(formacionesSeparadas)
    ? lista
    : lista.filter((x) => (x.modulo || "").includes("Hábito"));
  const formaciones = Array.isArray(formacionesSeparadas)
    ? formacionesSeparadas
    : lista.filter((x) => (x.modulo || "").includes("Formación"));

  const habitosActivos = habitos.filter((h) => !(h.estado || "").toLowerCase().includes("pausa")).length;
  const rachaMaxima = habitos.reduce((max, h) => Math.max(max, Number(h.racha_progreso) || 0), 0);
  const formacionesEnCurso = formaciones.filter((f) => {
    const e = (f.estado || "").toLowerCase();
    return e.includes("curso") || e.includes("progreso");
  }).length;
  const formacionesCompletadas = formaciones.filter((f) => {
    const e = (f.estado || "").toLowerCase();
    return e.includes("terminad") || e.includes("complet");
  }).length;

  return {
    totalHabitos: habitos.length,
    habitosActivos,
    rachaMaxima,
    totalFormaciones: formaciones.length,
    formacionesEnCurso,
    formacionesCompletadas,
  };
}

function construirPayloadHabito(datos) {
  const nombre = (datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const modulo = (datos.modulo || "").trim() || MODULOS_HABITOS[0];
  const estado = (datos.estado || "").trim() || (modulo.includes("Hábito") ? "Activo" : "Por empezar");
  const categoria = (datos.categoria || "").trim() || null;
  const frecuencia_meta = (datos.frecuenciaMeta || "").trim() || null;
  const ultima_fecha = (datos.ultimaFecha || "").trim() || null;
  const nota = (datos.nota || "").trim() || null;
  const historial_fechas = (datos.historialFechas || "").trim() || null;

  const rpRaw = datos.rachaProgreso !== "" && datos.rachaProgreso !== null && datos.rachaProgreso !== undefined
    ? Number(datos.rachaProgreso)
    : null;
  if (rpRaw !== null && (!Number.isFinite(rpRaw) || rpRaw < 0)) {
    return { ok: false, error: "La racha o progreso debe ser un número mayor o igual a 0." };
  }

  const payload = {
    nombre,
    modulo,
    estado,
    categoria,
    frecuencia_meta,
    racha_progreso: rpRaw,
    ultima_fecha,
    nota,
  };
  if (historial_fechas !== null) payload.historial_fechas = historial_fechas;
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
}

function parsearHistorialHabito(raw) {
  if (!raw) return { done: [], frozen: [] };
  let obj = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch (_e) { return { done: [], frozen: [] }; }
  }
  if (!obj || typeof obj !== "object") return { done: [], frozen: [] };
  const d = Array.isArray(obj.done) ? obj.done : (Array.isArray(obj.d) ? obj.d : []);
  const f = Array.isArray(obj.frozen) ? obj.frozen : (Array.isArray(obj.f) ? obj.f : []);
  const norm = (arr) => [...new Set(arr.filter((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort();
  return { done: norm(d), frozen: norm(f) };
}

function serializarHistorialHabito(hist) {
  const parsed = parsearHistorialHabito(hist);
  const full = JSON.stringify({ done: parsed.done, frozen: parsed.frozen });
  if (full.length <= 1900) return full;
  return JSON.stringify({ d: parsed.done.slice(-100), f: parsed.frozen.slice(-45) });
}

function estaHabitoHechoHoy(habito, fechaHoy) {
  if (!habito || !fechaHoy) return false;
  if (habito.ultima_fecha === fechaHoy) return true;
  const hist = parsearHistorialHabito(habito.historial_fechas);
  return hist.done.includes(fechaHoy);
}

function estaHabitoCongeladoHoy(habito, fechaHoy) {
  if (!habito || !fechaHoy) return false;
  const hist = parsearHistorialHabito(habito.historial_fechas);
  return hist.frozen.includes(fechaHoy);
}

function completarHabitoHoy(habito, fechaHoy) {
  if (!habito || !habito.id || !fechaHoy) return { changed: false };
  if (estaHabitoHechoHoy(habito, fechaHoy)) return { changed: false };

  const hist = parsearHistorialHabito(habito.historial_fechas);
  hist.done.push(fechaHoy);
  const nuevaRacha = (Number(habito.racha_progreso) || 0) + 1;
  const historialStr = serializarHistorialHabito(hist);

  const payload = {
    page_id: habito.id,
    nombre: habito.nombre,
    modulo: habito.modulo || MODULOS_HABITOS[0],
    estado: habito.estado || "Activo",
    categoria: habito.categoria || null,
    frecuencia_meta: habito.frecuencia_meta || null,
    racha_progreso: nuevaRacha,
    ultima_fecha: fechaHoy,
    nota: habito.nota || null,
    historial_fechas: historialStr,
  };

  return {
    changed: true,
    payload,
    actualizado: {
      ...habito,
      racha_progreso: nuevaRacha,
      ultima_fecha: fechaHoy,
      historial_fechas: historialStr,
    },
  };
}

function alternarCongelacionHabitoHoy(habito, fechaHoy, activar) {
  if (!habito || !habito.id || !fechaHoy) return { changed: false };
  const hist = parsearHistorialHabito(habito.historial_fechas);
  const yaCongelado = hist.frozen.includes(fechaHoy);
  if (activar && yaCongelado) return { changed: false };
  if (!activar && !yaCongelado) return { changed: false };

  const nextFrozen = activar
    ? [...hist.frozen, fechaHoy]
    : hist.frozen.filter((d) => d !== fechaHoy);
  const historialStr = serializarHistorialHabito({ done: hist.done, frozen: nextFrozen });

  const payload = {
    page_id: habito.id,
    nombre: habito.nombre,
    modulo: habito.modulo || MODULOS_HABITOS[0],
    estado: habito.estado || "Activo",
    categoria: habito.categoria || null,
    frecuencia_meta: habito.frecuencia_meta || null,
    racha_progreso: habito.racha_progreso !== undefined ? habito.racha_progreso : null,
    ultima_fecha: habito.ultima_fecha || null,
    nota: habito.nota || null,
    historial_fechas: historialStr,
  };

  return {
    changed: true,
    payload,
    actualizado: { ...habito, historial_fechas: historialStr },
  };
}

function calcularMatriz52Semanas(habitos, fechaHoy) {
  const baseDate = fechaHoy && /^\d{4}-\d{2}-\d{2}$/.test(fechaHoy)
    ? new Date(`${fechaHoy}T12:00:00Z`)
    : new Date();
  // Lunes de la semana actual (UTC)
  const day = baseDate.getUTCDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const currentMon = new Date(baseDate.getTime() + diffToMon * 86400000);

  const doneCounts = {};
  const frozenCounts = {};
  (habitos || []).forEach((h) => {
    const hist = parsearHistorialHabito(h.historial_fechas);
    if (h.ultima_fecha && !hist.done.includes(h.ultima_fecha)) hist.done.push(h.ultima_fecha);
    hist.done.forEach((d) => { doneCounts[d] = (doneCounts[d] || 0) + 1; });
    hist.frozen.forEach((d) => { frozenCounts[d] = (frozenCounts[d] || 0) + 1; });
  });

  const celdas = [];
  for (let w = 51; w >= 0; w--) {
    const start = new Date(currentMon.getTime() - w * 7 * 86400000);
    let cumplidos = 0;
    let congelados = 0;
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getTime() + d * 86400000);
      const iso = dt.toISOString().slice(0, 10);
      cumplidos += doneCounts[iso] || 0;
      if (frozenCounts[iso]) congelados += 1;
    }
    const dd = String(start.getUTCDate()).padStart(2, "0");
    const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
    const nivel = cumplidos === 0 ? 0 : cumplidos <= 2 ? 1 : cumplidos <= 4 ? 2 : 3;
    const esCongelada = congelados > 0;
    const partes = [];
    if (cumplidos > 0) partes.push(`${cumplidos} ${cumplidos === 1 ? "cumplido" : "cumplidos"}`);
    if (congelados > 0) partes.push(`${congelados} ${congelados === 1 ? "día congelado" : "días congelados"}`);
    const detalle = partes.length > 0 ? partes.join(" · ") : "Sin registros";
    celdas.push({
      semanaInicio: start.toISOString().slice(0, 10),
      cumplidos,
      congelados,
      nivel,
      esCongelada,
      tooltip: `Semana del ${dd}/${mm}: ${detalle}`,
    });
  }
  return celdas;
}

function construirPayloadFormacion(datos) {
  const tema = (datos.tema || "").trim();
  if (!tema) return { ok: false, error: "El tema de la formación es obligatorio." };

  const inicio = (datos.inicio || "").trim() || null;
  const fin = (datos.fin || "").trim() || null;
  if (inicio && fin && fin < inicio) {
    return { ok: false, error: "La fecha de fin no puede ser anterior al inicio." };
  }

  const payload = {
    tema,
    estado: (datos.estado || "").trim() || "Sin empezar",
    plataforma: (datos.plataforma || "").trim() || null,
    tematica: Array.isArray(datos.tematica) ? datos.tematica.filter(Boolean) : [],
    inicio,
    fin,
    seccion_onenote: (datos.seccionOnenote || "").trim() || null,
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;
  return { ok: true, payload };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MODULOS_HABITOS,
    ESTADOS_FORMACION,
    ESTADOS_HABITOS_ALL,
    CATEGORIAS_HABITOS,
    calcularResumenHabitos,
    construirPayloadHabito,
    construirPayloadFormacion,
    parsearHistorialHabito,
    serializarHistorialHabito,
    estaHabitoHechoHoy,
    estaHabitoCongeladoHoy,
    completarHabitoHoy,
    alternarCongelacionHabitoHoy,
    calcularMatriz52Semanas,
  };
}
