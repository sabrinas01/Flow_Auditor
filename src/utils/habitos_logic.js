/**
 * Lógica pura (sin DOM, sin red) del módulo Hábitos y disciplina
 * (habitos-y-disciplina.html), conectado a la BD de Notion "🔥 Hábitos y Disciplina".
 */

const MODULOS_HABITOS = ["🔥 Hábito", "🎓 Formación / Curso"];
const ESTADOS_FORMACION = ["Por empezar", "En progreso", "En pausa", "Completado"];
const ESTADOS_HABITOS_ALL = ["Activo", ...ESTADOS_FORMACION];
const CATEGORIAS_HABITOS = [
  "🌅 Mañana",
  "🌙 Noche",
  "🧠 Mente & Foco",
  "💪 Cuerpo & Salud",
  "💼 Carrera & Tech",
];

function calcularResumenHabitos(items) {
  const lista = Array.isArray(items) ? items : [];
  const habitos = lista.filter((x) => (x.modulo || "").includes("Hábito"));
  const formaciones = lista.filter((x) => (x.modulo || "").includes("Formación"));

  const habitosActivos = habitos.filter((h) => !(h.estado || "").toLowerCase().includes("pausa")).length;
  const rachaMaxima = habitos.reduce((max, h) => Math.max(max, Number(h.racha_progreso) || 0), 0);
  const formacionesEnCurso = formaciones.filter((f) => (f.estado || "").toLowerCase().includes("progreso")).length;
  const formacionesCompletadas = formaciones.filter((f) => (f.estado || "").toLowerCase().includes("complet")).length;

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
  };
}
