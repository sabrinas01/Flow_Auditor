/**
 * Lógica pura (sin DOM, sin red) del módulo Salud (salud.html):
 * - Cálculo de fase actual del ciclo menstrual y próximo inicio.
 * - Construcción de matriz de calendario mensual con etapas marcadas.
 * - Validación y construcción de payloads para Diario de sesiones, Ciclo
 *   menstrual y Pendientes de Salud.
 */

const FASES_CICLO = [
  { key: "menstrual", label: "Fase menstrual", emoji: "❄️", estacion: "Invierno", color: "#ff5f52", bgClass: "bg-[#ff5f52]/25 text-[#ff5f52] border-[#ff5f52]/50" },
  { key: "folicular", label: "Fase Folicular", emoji: "🌸", estacion: "Primavera", color: "#53a759", bgClass: "bg-[#53a759]/25 text-[#53a759] border-[#53a759]/50" },
  { key: "ovulatoria", label: "Fase ovulatoria", emoji: "☀️", estacion: "Verano", color: "#ffb961", bgClass: "bg-[#ffb961]/25 text-[#ffb961] border-[#ffb961]/50" },
  { key: "lutea", label: "Fase Lútea", emoji: "🍂", estacion: "Otoño", color: "#00aaff", bgClass: "bg-[#00aaff]/25 text-[#00aaff] border-[#00aaff]/50" },
];

function clasificarFasePorNombre(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("menstrual")) return FASES_CICLO[0];
  if (n.includes("folicular")) return FASES_CICLO[1];
  if (n.includes("ovulat")) return FASES_CICLO[2];
  if (n.includes("lútea") || n.includes("lutea")) return FASES_CICLO[3];
  return null;
}

function obtenerResumenCiclo(fases, hoyIso) {
  const lista = Array.isArray(fases) ? fases : [];
  if (lista.length === 0) {
    return { faseActual: "Sin registros", proximoInicio: null };
  }

  const activa = lista.find((f) => {
    const ini = f.inicio || "";
    const fin = f.fin || f.inicio || "";
    return ini && hoyIso >= ini && hoyIso <= fin;
  });

  const ordenadas = [...lista].sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
  const referencia = activa || ordenadas[0];

  const futuros = lista
    .map((f) => f.proximo_inicio)
    .filter((d) => d && d >= hoyIso)
    .sort();

  return {
    faseActual: referencia ? referencia.nombre : "Sin registros",
    proximoInicio: futuros[0] || (referencia ? referencia.proximo_inicio : null) || null,
  };
}

function construirPayloadSesion(datos) {
  const nombre = (datos.nombre || "").trim();
  const fecha = (datos.fecha || "").trim();
  if (!nombre) return { ok: false, error: "El nombre de la sesión es obligatorio." };
  if (!fecha) return { ok: false, error: "La fecha es obligatoria." };

  const durRaw = datos.duracion !== "" && datos.duracion !== null && datos.duracion !== undefined
    ? Number(datos.duracion)
    : null;

  return {
    ok: true,
    payload: {
      nombre,
      fecha,
      duracion: Number.isFinite(durRaw) && durRaw >= 0 ? durRaw : null,
      estado: (datos.estado || "").trim() || "Hecha",
    },
  };
}

function construirPayloadCiclo(datos) {
  const fase = (datos.fase || "").trim();
  const nombreDirecto = (datos.nombre || "").trim();
  const inicio = (datos.inicio || "").trim();
  const pageId = (datos.pageId || "").trim();
  if (!fase && !nombreDirecto) return { ok: false, error: "La etapa del ciclo es obligatoria." };
  if (!inicio) return { ok: false, error: "La fecha de inicio es obligatoria." };

  const mes = inicio.slice(5, 7);
  const nombre = nombreDirecto || `[${mes}]-${fase}`;
  const fin = (datos.fin || "").trim() || null;
  if (fin && fin < inicio) {
    return { ok: false, error: "La fecha de fin no puede ser anterior al inicio." };
  }

  const payload = {
    nombre,
    inicio,
    fin,
    inicio_real: (datos.inicioReal || "").trim() || inicio,
    fin_real: (datos.finReal || "").trim() || null,
    sintomas: Array.isArray(datos.sintomas) ? datos.sintomas.filter(Boolean) : (datos.sintomas ? [datos.sintomas] : []),
  };
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
}

function construirPayloadPendienteSalud(datos) {
  const nombre = (datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "El nombre de la tarea es obligatorio." };

  return {
    ok: true,
    payload: {
      nombre,
      tipo: (datos.tipo || "").trim() || null,
      fecha_limite: (datos.fechaLimite || "").trim() || null,
      estado: (datos.estado || "").trim() || "Pendiente",
    },
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FASES_CICLO,
    clasificarFasePorNombre,
    obtenerResumenCiclo,
    construirPayloadSesion,
    construirPayloadCiclo,
    construirPayloadPendienteSalud,
  };
}
