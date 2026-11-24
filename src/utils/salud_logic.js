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

  const payload = {
    nombre,
    fecha,
    duracion: Number.isFinite(durRaw) && durRaw >= 0 ? durRaw : null,
    estado: (datos.estado || "").trim() || "Hecha",
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
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

  const payload = {
    nombre,
    tipo: (datos.tipo || "").trim() || null,
    fecha_limite: (datos.fechaLimite || "").trim() || null,
    estado: (datos.estado || "").trim() || "Pendiente",
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
}

function calcularMetricasSesiones(sesiones, hoyIso) {
  const lista = Array.isArray(sesiones) ? sesiones : [];
  const base = hoyIso ? new Date(`${hoyIso}T00:00:00`) : new Date();
  const hace7 = new Date(base);
  hace7.setDate(base.getDate() - 6);
  const p = (n) => String(n).padStart(2, "0");
  const limIni = `${hace7.getFullYear()}-${p(hace7.getMonth() + 1)}-${p(hace7.getDate())}`;
  const limFin = `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}`;

  const semana = lista.filter((s) => s.fecha && s.fecha >= limIni && s.fecha <= limFin);
  const hechasSemana = semana.filter((s) => (s.estado || "").toLowerCase().includes("hech"));
  const fuente = semana.length > 0 ? semana : lista;
  const hechas = fuente.filter((s) => (s.estado || "").toLowerCase().includes("hech"));
  const minutos = (semana.length > 0 ? hechasSemana : hechas).reduce((acc, s) => acc + (Number(s.duracion) || 0), 0);
  const consistencia = fuente.length > 0 ? Math.round((hechas.length / fuente.length) * 100) : 0;

  return {
    sesionesSemana: hechasSemana.length,
    minutosActivos: minutos,
    consistenciaPct: consistencia,
    totalRegistros: lista.length,
  };
}

function calcularResumenMenteSalud(registros) {
  const lista = Array.isArray(registros) ? registros : [];
  if (lista.length === 0) {
    return {
      totalRegistros: 0,
      calmaPromedio: null,
      energiaPromedio: null,
      pausasStop: 0,
      barometroActual: "Sin registros",
      ultimaReflexion: null,
      ultimaFecha: null,
    };
  }
  const calmas = lista.map((r) => Number(r.calma)).filter((n) => Number.isFinite(n) && n > 0);
  const energias = lista.map((r) => Number(r.energia)).filter((n) => Number.isFinite(n) && n > 0);
  const calmaPromedio = calmas.length > 0 ? Number((calmas.reduce((a, b) => a + b, 0) / calmas.length).toFixed(1)) : null;
  const energiaPromedio = energias.length > 0 ? Number((energias.reduce((a, b) => a + b, 0) / energias.length).toFixed(1)) : null;
  const pausasStop = lista.filter((r) => Boolean(r.stop)).length;
  const conReflexion = lista.find((r) => (r.reflexion || "").trim());
  const reciente = lista[0];

  return {
    totalRegistros: lista.length,
    calmaPromedio,
    energiaPromedio,
    pausasStop,
    barometroActual: reciente.barometro || "Sin estado",
    ultimaReflexion: conReflexion ? conReflexion.reflexion.trim() : null,
    ultimaFecha: reciente.fecha || null,
  };
}

const PERFILES_ENERGIA_FASE = {
  menstrual: {
    puntajeBase: 5.5,
    etiqueta: "Introspectiva y suave",
    descripcion: "Fase de renovación física: prioriza descanso reparador y baja carga.",
    curva: [
      { franja: "Mañana (07:00 - 13:00)", nivel: "Moderada", pct: 60 },
      { franja: "Tarde (13:00 - 19:00)", nivel: "Suave", pct: 45 },
      { franja: "Noche (19:00 - 23:00)", nivel: "Descanso", pct: 25 },
    ],
    factores: [
      { icono: "local_drink", titulo: "Hidratación tibia & hierro", detalle: "Infusiones calmantes y comida reconfortante" },
      { icono: "bedtime", titulo: "Sueño prioritario", detalle: "Permitir pausas y acostarse temprano" },
      { icono: "self_improvement", titulo: "Movimiento gentil", detalle: "Estiramientos suaves o caminata tranquila" },
    ],
  },
  folicular: {
    puntajeBase: 8.0,
    etiqueta: "Creativa y en ascenso",
    descripcion: "Energía en subida ideal para planificar, aprender y retomar impulso.",
    curva: [
      { franja: "Mañana (07:00 - 13:00)", nivel: "Alta", pct: 85 },
      { franja: "Tarde (13:00 - 19:00)", nivel: "Sostenida", pct: 75 },
      { franja: "Noche (19:00 - 23:00)", nivel: "Estable", pct: 50 },
    ],
    factores: [
      { icono: "wb_sunny", titulo: "Luz natural matutina", detalle: "Sincroniza el ritmo circadiano al despertar" },
      { icono: "directions_run", titulo: "Entrenamiento progresivo", detalle: "Buen momento para sumar intensidad" },
      { icono: "restaurant", titulo: "Proteína y fibra fresca", detalle: "Sostiene la vitalidad sin picos" },
    ],
  },
  ovulatoria: {
    puntajeBase: 9.0,
    etiqueta: "Radiante y expansiva",
    descripcion: "Pico natural de vitalidad, claridad y disposición social.",
    curva: [
      { franja: "Mañana (07:00 - 13:00)", nivel: "Máxima", pct: 95 },
      { franja: "Tarde (13:00 - 19:00)", nivel: "Alta", pct: 85 },
      { franja: "Noche (19:00 - 23:00)", nivel: "Activa", pct: 60 },
    ],
    factores: [
      { icono: "water_drop", titulo: "Hidratación constante", detalle: "Acompaña el mayor gasto energético diario" },
      { icono: "fitness_center", titulo: "Sesión de fuerza o cardio", detalle: "Aprovecha el pico de recuperación" },
      { icono: "phonelink_erase", titulo: "Cierre de pantallas", detalle: "Desacelerar antes de dormir pese al envión" },
    ],
  },
  lutea: {
    puntajeBase: 6.5,
    etiqueta: "Serena y enfocada",
    descripcion: "Ritmo estable con tendencia a la calma; cuidar límites y descanso.",
    curva: [
      { franja: "Mañana (07:00 - 13:00)", nivel: "Buena", pct: 75 },
      { franja: "Tarde (13:00 - 19:00)", nivel: "Estable", pct: 60 },
      { franja: "Noche (19:00 - 23:00)", nivel: "Desaceleración", pct: 35 },
    ],
    factores: [
      { icono: "restaurant", titulo: "Alimentación antiinflamatoria", detalle: "Omega-3, hojas verdes y magnesio" },
      { icono: "wb_sunny", titulo: "Pausa al aire libre", detalle: "15-20 min de aire y sol para sostener ánimo" },
      { icono: "phonelink_erase", titulo: "Higiene del sueño", detalle: "Bajar estímulos desde las 22:00" },
    ],
  },
};

function calcularEnergiaDesdeCiclo(fases, registrosMente, hoyIso) {
  const resumenCiclo = obtenerResumenCiclo(fases, hoyIso);
  const infoFase = clasificarFasePorNombre(resumenCiclo.faseActual);
  const key = infoFase ? infoFase.key : "folicular";
  const perfil = PERFILES_ENERGIA_FASE[key];
  const mente = calcularResumenMenteSalud(registrosMente);
  const energiaFinal = mente.energiaPromedio !== null ? mente.energiaPromedio : perfil.puntajeBase;

  return {
    faseKey: key,
    faseNombre: resumenCiclo.faseActual,
    puntaje: energiaFinal,
    fuentePuntaje: mente.energiaPromedio !== null ? "Gestión emocional" : "Proyección de ciclo",
    etiqueta: perfil.etiqueta,
    descripcion: perfil.descripcion,
    curva: perfil.curva,
    factores: perfil.factores,
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
    calcularMetricasSesiones,
    calcularResumenMenteSalud,
    calcularEnergiaDesdeCiclo,
  };
}
