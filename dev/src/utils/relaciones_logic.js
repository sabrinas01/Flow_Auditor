/**
 * Lógica pura (sin DOM, sin red) del módulo Relaciones y límites (relaciones-y-limites.html).
 */

function calcularResumenRelaciones(afirmaciones, frases) {
  const afs = Array.isArray(afirmaciones) ? afirmaciones : [];
  const frs = Array.isArray(frases) ? frases : [];
  return {
    totalAfirmaciones: afs.length,
    integradas: afs.filter((a) => Boolean(a.integrada)).length,
    totalFrases: frs.length,
  };
}

function construirPayloadAfirmacion(datos) {
  const nombre = (datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "La afirmación es obligatoria." };
  const payload = {
    nombre,
    categoria: (datos.categoria || "").trim() || null,
    contexto: (datos.contexto || "").trim() || null,
    integrada: Boolean(datos.integrada),
    nota: (datos.nota || "").trim(),
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;
  return { ok: true, payload };
}

function construirPayloadFrase(datos) {
  const frase = (datos.frase || "").trim();
  if (!frase) return { ok: false, error: "El texto de la frase es obligatorio." };
  const payload = {
    frase,
    autor: (datos.autor || "").trim(),
  };
  const pageId = (datos.pageId || "").trim();
  if (pageId) payload.page_id = pageId;
  return { ok: true, payload };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calcularResumenRelaciones,
    construirPayloadAfirmacion,
    construirPayloadFrase,
  };
}
