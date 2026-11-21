/**
 * Lógica pura (sin DOM, sin red) del módulo Finanzas (finanzas.html):
 * cálculo de resumen mensual (Total Ingresos, Total Egresos, Balance),
 * formateo de moneda y validación/construcción de payloads para Ingresos y
 * Egresos hacia Notion vía notion_write.
 */

function calcularResumenFinanzas(ingresos, egresos) {
  const totalIngresos = (ingresos || []).reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const totalEgresos = (egresos || []).reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  return {
    totalIngresos,
    totalEgresos,
    balance: totalIngresos - totalEgresos,
  };
}

function formatearMonedaARS(valor) {
  const num = Number(valor) || 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function construirPayloadIngreso(datos) {
  const titulo = (datos.titulo || "").trim();
  const fecha = (datos.fecha || "").trim();
  const monto = Number(datos.monto);
  const pageId = (datos.pageId || "").trim();

  if (!titulo) {
    return { ok: false, error: "El título del ingreso es obligatorio." };
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!fecha) {
    return { ok: false, error: "La fecha es obligatoria." };
  }

  const payload = {
    titulo,
    monto,
    fecha,
    tipo: (datos.tipo || "").trim() || null,
  };
  if (pageId) payload.page_id = pageId;
  return { ok: true, payload };
}

function construirPayloadEgreso(datos) {
  const nombre = (datos.nombre || "").trim();
  const fecha = (datos.fecha || "").trim();
  const monto = Number(datos.monto);
  const pageId = (datos.pageId || "").trim();

  if (!nombre) {
    return { ok: false, error: "El nombre del gasto es obligatorio." };
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!fecha) {
    return { ok: false, error: "La fecha es obligatoria." };
  }

  const montoUsdRaw = datos.montoUsd !== "" && datos.montoUsd !== null && datos.montoUsd !== undefined
    ? Number(datos.montoUsd)
    : null;
  const cuotasRaw = datos.cuotas !== "" && datos.cuotas !== null && datos.cuotas !== undefined
    ? Number(datos.cuotas)
    : null;

  const payload = {
    nombre,
    monto,
    monto_usd: Number.isFinite(montoUsdRaw) && montoUsdRaw > 0 ? montoUsdRaw : null,
    fecha,
    forma_pago: Array.isArray(datos.formaPago) ? datos.formaPago.filter(Boolean) : (datos.formaPago ? [datos.formaPago] : []),
    tarjeta: (datos.tarjeta || "").trim() || null,
    cuotas: Number.isFinite(cuotasRaw) && cuotasRaw > 0 ? cuotasRaw : null,
    categoria: Array.isArray(datos.categoria) ? datos.categoria.filter(Boolean) : (datos.categoria ? [datos.categoria] : []),
    detalle: (datos.detalle || "").trim() || null,
  };
  if (pageId) payload.page_id = pageId;
  return { ok: true, payload };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calcularResumenFinanzas,
    formatearMonedaARS,
    construirPayloadIngreso,
    construirPayloadEgreso,
  };
}
