/**
 * Funciones que sí tocan el DOM, extraídas de index.html (renderizarFilasEstados,
 * toggleBloque), recordatorios-varios.html (renderizarRecordatoriosVarios) y
 * agenda-personal.html (formatHora, renderizarAgendaEventos) para poder
 * testearlas con Jest + jsdom — antes vivían inline en el <script> de cada
 * página, sin forma de testearse. Dependen de escapeHtml/obtenerEstiloEstado/
 * ordenarEntradasPorJerarquia de dashboard_logic.js como globals: en el
 * navegador llegan por el <script> que carga antes; en tests, quien las use
 * debe exponerlas primero (ver tests/unit/dom_render.test.js).
 */

/**
 * Renderizar la lista de estados preservando nombres, emoticones y cantidades,
 * respetando la jerarquía de estados del PRD/SRS (ordenarEntradasPorJerarquia).
 */
function renderizarFilasEstados(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || Object.keys(data).length === 0) {
    container.innerHTML = `<div class="status-row left-pill-blue flex items-center justify-center py-3.5 px-4 text-[#8e8e93] text-[13px]">Sin planificación registrada</div>`;
    return;
  }

  const entradas = ordenarEntradasPorJerarquia(data);

  container.innerHTML = entradas.map(([estado, cantidad]) => {
    const estilo = obtenerEstiloEstado(estado);
    const iconoHtml = estilo.icon
      ? `<span class="material-symbols-outlined text-[18px] ${estilo.iconClass}" style="font-variation-settings: 'FILL' 1;">${estilo.icon}</span>`
      : "";
    return `
        <div class="status-row ${estilo.pill} flex justify-between items-center px-4 py-3.5">
            <div class="flex items-center gap-3">
                ${iconoHtml}
                <span class="${estilo.textClass} truncate pr-2">${escapeHtml(estado)}</span>
            </div>
            <span class="text-white font-bold text-[15px]">${cantidad}</span>
        </div>
    `;
  }).join('');
}

/**
 * Colapsa/expande el contenido de un bloque (Ayer/Hoy), rotando el chevron.
 */
function toggleBloque(prefijo) {
  const content = document.getElementById(`content-${prefijo}`);
  const chevron = document.getElementById(`chevron-${prefijo}`);
  const boton = chevron.closest("button");

  const colapsado = content.classList.toggle("hidden");
  chevron.style.transform = colapsado ? "rotate(-90deg)" : "rotate(0deg)";
  boton.setAttribute("aria-expanded", String(!colapsado));
}

/**
 * Renderiza un bloque de Recordatorios Varios (recordatorios-varios.html):
 * un ítem por fila, con su propio Nombre/Estado/Prioridad/Área/Periodo/Fecha
 * — a diferencia de renderizarFilasEstados, acá no se agrega por estado.
 * Reutiliza escapeHtml/obtenerEstiloEstado para mantener la misma
 * codificación visual (verde=hecha, rojo=fallida/vencida) en toda la app.
 * Extraída de recordatorios-varios.html en v4.23 (HU Notion Épica 2 #11)
 * para poder testearla con Jest + jsdom.
 */
function renderizarRecordatoriosVarios(prefijo, items) {
  const container = document.getElementById(`list-${prefijo}`);
  document.getElementById(`total-${prefijo}-lbl`).innerText = `${items.length} ítems`;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="status-row left-pill-blue flex items-center justify-center py-3.5 px-4 text-[#8e8e93] text-[13px]">Sin recordatorios registrados</div>`;
    return;
  }

  container.innerHTML = items.map((item) => {
    const estilo = obtenerEstiloEstado(item.estado || "Sin estado");
    const meta = [item.area, item.periodo, item.prioridad, item.fecha]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" · ");
    return `
        <div class="status-row ${estilo.pill} flex justify-between items-center px-4 py-3.5 gap-3">
            <div class="flex flex-col gap-1 min-w-0">
                <span class="text-white font-semibold truncate">${escapeHtml(item.nombre || "Sin nombre")}</span>
                ${meta ? `<span class="text-[#8e8e93] text-[12px] truncate">${meta}</span>` : ""}
            </div>
            <span class="${estilo.textClass} text-[13px] whitespace-nowrap">${escapeHtml(item.estado || "Sin estado")}</span>
        </div>
    `;
  }).join('');
}

/**
 * Extrae "HH:MM" de un string ISO-8601 (Fecha.start/Fecha.end de Notion).
 * Sin librería de fechas: mismo criterio vanilla-JS-sin-bundler que el
 * resto del proyecto.
 */
function formatHora(isoStr) {
  if (!isoStr) return "--:--";
  const m = isoStr.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "--:--";
}

/**
 * Renderiza un bloque de Eventos de Agenda Personal (agenda-personal.html):
 * una fila por evento con hora de inicio/fin, nombre y lugar. Reutiliza
 * escapeHtml para prevenir XSS. Extraída de agenda-personal.html en v4.23
 * (HU Notion Épica 2 #11) para poder testearla con Jest + jsdom.
 */
function renderizarAgendaEventos(prefijo, items) {
  const container = document.getElementById(`list-${prefijo}`);
  document.getElementById(`total-${prefijo}-lbl`).innerText = `${items.length} eventos`;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="status-row left-pill-blue flex items-center justify-center py-3.5 px-4 text-[#8e8e93] text-[13px]">Sin eventos registrados</div>`;
    return;
  }

  const pill = prefijo === "eventos-ayer" ? "left-pill-blue"
    : prefijo === "eventos-hoy" ? "left-pill-red"
    : "left-pill-orange";

  container.innerHTML = items.map((item) => {
    const meta = [item.lugar].filter(Boolean).map(escapeHtml).join(" · ");
    return `
        <div class="status-row ${pill} flex items-center px-4 py-3.5 gap-4">
            <div class="flex flex-col items-center w-14 flex-shrink-0">
                <span class="text-white font-bold text-[13px]">${escapeHtml(formatHora(item.inicio))}</span>
                <span class="text-[#8e8e93] text-[11px]">${escapeHtml(formatHora(item.fin))}</span>
            </div>
            <div class="flex flex-col gap-1 min-w-0 flex-1">
                <span class="text-white font-semibold truncate">${escapeHtml(item.nombre || "Sin nombre")}</span>
                ${meta ? `<span class="text-[#8e8e93] text-[12px] truncate">${meta}</span>` : ""}
            </div>
        </div>
    `;
  }).join('');
}

/**
 * Crea el manejador del botón de refresco animado del header (btn-refresh/
 * icon-refresh): al presionarlo agrega la clase de giro y deshabilita el
 * botón; tras el debounce (1200ms por defecto) la quita, lo rehabilita y
 * dispara la recarga real. Extraída de index.html/recordatorios-varios.html/
 * agenda-personal.html en v4.24 (SRS-FR-M3-305, HU Notion Épica 2 #12) para
 * poder testearla sin depender de `location.reload()` (jsdom no lo
 * implementa) — `onRecargar` es inyectable, por defecto
 * `() => location.reload()` en el navegador real.
 */
function crearManejadorDeRefresco(debounceFn, { onRecargar = () => location.reload(), delayMs = 1200 } = {}) {
  const dispararRecargaDiferida = debounceFn(() => {
    document.getElementById("icon-refresh").classList.remove("spin-animation");
    document.getElementById("btn-refresh").disabled = false;
    onRecargar();
  }, delayMs);

  return function recargarDashboard() {
    document.getElementById("icon-refresh").classList.add("spin-animation");
    document.getElementById("btn-refresh").disabled = true;
    dispararRecargaDiferida();
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderizarFilasEstados,
    toggleBloque,
    renderizarRecordatoriosVarios,
    formatHora,
    renderizarAgendaEventos,
    crearManejadorDeRefresco,
  };
}
