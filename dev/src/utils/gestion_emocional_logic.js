/**
 * Lógica pura (sin DOM, sin red) del módulo Gestión emocional (gestion-emocional.html):
 * - Cálculo de métricas (total, barómetro predominante, calma promedio, % S.T.O.P.).
 * - Validación y construcción de payload para Notion (🧠 Gestión emocional).
 */

const BAROMETRO_OPCIONES = [
  "😌 En calma",
  "🎯 Enfocada",
  "✨ Inspirada",
  "😰 Ansiosa",
  "😴 Agotada",
  "😢 Triste",
  "😠 Frustrada",
];

function calcularResumenEmocional(registros) {
  const lista = Array.isArray(registros) ? registros : [];
  if (lista.length === 0) {
    return {
      total: 0,
      calmaPromedio: "0.0",
      energiaPromedio: "0.0",
      predominante: "Sin registros",
      conStop: 0,
    };
  }

  let sumCalma = 0;
  let cntCalma = 0;
  let sumEnergia = 0;
  let cntEnergia = 0;
  let conStop = 0;
  const conteoBar = {};

  lista.forEach((r) => {
    if (Number.isFinite(Number(r.calma)) && r.calma !== null && r.calma !== "") {
      sumCalma += Number(r.calma);
      cntCalma++;
    }
    if (Number.isFinite(Number(r.energia)) && r.energia !== null && r.energia !== "") {
      sumEnergia += Number(r.energia);
      cntEnergia++;
    }
    if (r.stop) conStop++;
    if (r.barometro) {
      conteoBar[r.barometro] = (conteoBar[r.barometro] || 0) + 1;
    }
  });

  const predominante = Object.entries(conteoBar).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sin datos";

  return {
    total: lista.length,
    calmaPromedio: cntCalma ? (sumCalma / cntCalma).toFixed(1) : "0.0",
    energiaPromedio: cntEnergia ? (sumEnergia / cntEnergia).toFixed(1) : "0.0",
    predominante,
    conStop,
  };
}

function construirPayloadRegistroEmocional(datos) {
  const nombre = (datos.nombre || "").trim();
  const fecha = (datos.fecha || "").trim();
  if (!nombre) return { ok: false, error: "El título o resumen del registro es obligatorio." };
  if (!fecha) return { ok: false, error: "La fecha es obligatoria." };

  const calmaNum = Number(datos.calma);
  const energiaNum = Number(datos.energia);
  const payload = {
    nombre,
    fecha,
    barometro: (datos.barometro || "").trim() || null,
    emocion_id: (datos.emocionId || "").trim() || null,
    calma: Number.isFinite(calmaNum) ? Math.min(10, Math.max(1, calmaNum)) : 7,
    energia: Number.isFinite(energiaNum) ? Math.min(10, Math.max(1, energiaNum)) : 7,
    disparador: (datos.disparador || "").trim(),
    stop: Boolean(datos.stop),
    reflexion: (datos.reflexion || "").trim(),
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;

  return { ok: true, payload };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BAROMETRO_OPCIONES,
    calcularResumenEmocional,
    construirPayloadRegistroEmocional,
  };
}
