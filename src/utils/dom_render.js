/**
 * Funciones que sí tocan el DOM, extraídas de index.html para poder testearlas
 * con Jest + jsdom (antes vivían inline en el <script> de index.html, sin forma
 * de testearse). Dependen de escapeHtml/obtenerEstiloEstado/ordenarEntradasPorJerarquia
 * de dashboard_logic.js como globals: en el navegador llegan por el <script> que
 * carga antes; en tests, quien las use debe exponerlas primero (ver
 * tests/unit/dom_render.test.js).
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { renderizarFilasEstados, toggleBloque };
}
