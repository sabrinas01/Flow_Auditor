/**
 * Lógica pura (sin DOM, sin red) del módulo Salud (salud.html):
 * - Cálculo de fase actual del ciclo menstrual y próximo inicio.
 * - Construcción de matriz de calendario mensual con etapas marcadas.
 * - Validación y construcción de payloads para Diario de sesiones, Ciclo
 *   menstrual y Pendientes de Salud.
 */

const FASES_CICLO = [
  { key: "menstrual", label: "Fase menstrual", emoji: "❄️", estacion: "Invierno", color: "#38bdf8", bgClass: "bg-[#38bdf8]/25 text-[#38bdf8] border-[#38bdf8]/50" },
  { key: "folicular", label: "Fase Folicular", emoji: "🌸", estacion: "Primavera", color: "#f472b6", bgClass: "bg-[#f472b6]/25 text-[#f472b6] border-[#f472b6]/50" },
  { key: "ovulatoria", label: "Fase ovulatoria", emoji: "☀️", estacion: "Verano", color: "#facc15", bgClass: "bg-[#facc15]/25 text-[#facc15] border-[#facc15]/50" },
  { key: "lutea", label: "Fase Lútea", emoji: "🍂", estacion: "Otoño", color: "#fb923c", bgClass: "bg-[#fb923c]/25 text-[#fb923c] border-[#fb923c]/50" },
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
    return { faseActual: "Sin registros", proximoInicio: null, proximaFase: null, proximaFaseEmoji: null };
  }

  const activa = lista.find((f) => {
    const ini = f.inicio || "";
    const fin = f.fin || f.inicio || "";
    return ini && hoyIso >= ini && hoyIso <= fin;
  });

  const ordenadas = [...lista].sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
  const referencia = activa || ordenadas[0];

  const infoActual = referencia ? clasificarFasePorNombre(referencia.nombre) : null;
  const idxActual = infoActual ? FASES_CICLO.findIndex((f) => f.key === infoActual.key) : -1;
  const siguienteInfo = idxActual >= 0 ? FASES_CICLO[(idxActual + 1) % FASES_CICLO.length] : null;

  let proximoInicio = null;
  if (siguienteInfo) {
    const regSiguiente = ordenadas.find((f) => {
      const inf = clasificarFasePorNombre(f.nombre);
      return inf && inf.key === siguienteInfo.key;
    });
    if (regSiguiente) {
      const refIni = (referencia && referencia.inicio) || "";
      proximoInicio = (regSiguiente.inicio && regSiguiente.inicio > refIni)
        ? regSiguiente.inicio
        : (regSiguiente.proximo_inicio || null);
    }
  }
  if (!proximoInicio && referencia) {
    proximoInicio = referencia.proximo_inicio || null;
  }

  return {
    faseActual: referencia ? referencia.nombre : "Sin registros",
    proximoInicio,
    proximaFase: siguienteInfo ? siguienteInfo.label : null,
    proximaFaseEmoji: siguienteInfo ? siguienteInfo.emoji : null,
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
