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
 * Renderiza la lista colapsable de tareas de hoy en "Sin empezar" dentro de
 * "Progreso de hoy" (index.html): una fila por tarea, solo con su nombre. Si
 * no hay tareas, oculta el bloque entero (`wrap-${prefijo}`).
 */
function renderizarTareasSinEmpezar(prefijo, nombres) {
  const wrap = document.getElementById(`wrap-${prefijo}`);
  const container = document.getElementById(`list-${prefijo}`);

  if (!nombres || nombres.length === 0) {
    wrap.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  wrap.classList.remove("hidden");
  container.innerHTML = nombres.map((nombre) => `
        <div class="status-row flex items-center px-4 py-3">
            <span class="text-white truncate">${escapeHtml(nombre || "Sin nombre")}</span>
        </div>
    `).join('');
}

/**
 * Renderiza la lista de tareas de Recordatorios Diarios (Ayer/Hoy) con un
 * desplegable `<select>` de los estados de Notion para cambiar el estado
 * directamente desde index.html (Etapa 3).
 */
function renderizarTareasDiariasConEstado(prefijo, tareas, estadosDisponibles) {
  const wrap = document.getElementById(`wrap-${prefijo}`);
  const container = document.getElementById(`list-${prefijo}`);
  if (!wrap || !container) return;

  if (!tareas || tareas.length === 0) {
    wrap.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  wrap.classList.remove("hidden");
  const baseOpciones = Array.isArray(estadosDisponibles) && estadosDisponibles.length
    ? estadosDisponibles
    : ["Sin empezar", "En ejecución", "Hecha"];

  container.innerHTML = tareas.map((t) => {
    const opciones = baseOpciones.includes(t.estado) ? baseOpciones : [t.estado, ...baseOpciones];
    const optionsHtml = opciones
      .filter(Boolean)
      .map((op) => `<option value="${escapeHtml(op)}"${op === t.estado ? " selected" : ""}>${escapeHtml(op)}</option>`)
      .join("");
    const selectHtml = t.id
      ? `<select onchange="cambiarEstadoTareaDiaria('${escapeHtml(t.id)}', '${escapeHtml(t.tipo_estado || "status")}', this)"
            aria-label="Estado de ${escapeHtml(t.nombre || "tarea")}"
            class="bg-[#141416] border border-[#232326] rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-primary-container flex-shrink-0 max-w-[155px]">
            ${optionsHtml}
        </select>`
      : "";
    return `
        <div class="status-row flex items-center justify-between px-4 py-3 gap-3">
            <span class="text-white text-[14px] truncate">${escapeHtml(t.nombre || "Sin nombre")}</span>
            ${selectHtml}
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
 * un ítem por fila mostrando solo el Nombre (sin borde de color) — a
 * diferencia de renderizarFilasEstados, acá no se agrega por estado.
 * Extraída de recordatorios-varios.html en v4.23 (HU Notion Épica 2 #11)
 * para poder testearla con Jest + jsdom.
 */
function renderizarRecordatoriosVarios(prefijo, items) {
  const container = document.getElementById(`list-${prefijo}`);
  document.getElementById(`total-${prefijo}-lbl`).innerText = `${items.length} ítems`;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="status-row flex items-center justify-center py-3.5 px-4 text-[#8e8e93] text-[13px]">Sin recordatorios registrados</div>`;
    return;
  }

  const esEditable = prefijo === "varios-ayer" || prefijo === "varios-hoy";
  container.innerHTML = items.map((item, idx) => {
    const botonEditar = esEditable && item.id
      ? `<button type="button" onclick="abrirModalEditarVarios('${escapeHtml(prefijo)}', ${idx})"
            class="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[#8e8e93] hover:text-white flex-shrink-0"
            title="Editar fecha y estado" aria-label="Editar fecha y estado">
            <span class="material-symbols-outlined text-[18px]">edit</span>
        </button>`
      : "";
    return `
        <div class="status-row flex items-center justify-between px-4 py-3.5 gap-3">
            <span class="text-white font-semibold truncate">${escapeHtml(item.nombre || "Sin nombre")}</span>
            ${botonEditar}
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
 * una fila por evento con hora de inicio/fin, nombre, tipo y lugar (tipo
 * agregado en v4.25 — SRS-FR-M5-505, HU Notion Épica 2 #8, sale de la
 * propiedad "Tipo de tarea" de la BD "Eventos y Recordatorios únicos").
 * Reutiliza escapeHtml para prevenir XSS. Extraída de agenda-personal.html
 * en v4.23 (HU Notion Épica 2 #11) para poder testearla con Jest + jsdom.
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

  container.innerHTML = items.map((item, idx) => {
    const meta = [item.tipo, item.lugar].filter(Boolean).map(escapeHtml).join(" · ");
    const tieneId = Boolean(item.id);
    const accionesHtml = tieneId
      ? `<div class="flex items-center gap-1 flex-shrink-0">
            <button type="button" onclick="abrirModalEditarEvento('${escapeHtml(prefijo)}', ${idx})"
                class="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[#8e8e93] hover:text-white"
                title="Editar tarea" aria-label="Editar tarea">
                <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button type="button" onclick="confirmarEliminarEvento('${escapeHtml(prefijo)}', ${idx})"
                class="p-1.5 hover:bg-[#ff5f52]/15 rounded-lg transition-colors text-[#8e8e93] hover:text-[#ff5f52]"
                title="Mandar a la papelera" aria-label="Mandar a la papelera">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
        </div>`
      : "";
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
            ${accionesHtml}
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

function mostrarToast(mensaje, tipo = "success") {
  if (typeof document === "undefined") return;
  let cont = document.getElementById("asistente-toast-container");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "asistente-toast-container";
    cont.className = "fixed bottom-5 right-5 z-[70] flex flex-col gap-2 max-w-xs pointer-events-none";
    document.body.appendChild(cont);
  }
  const estilos = {
    success: "bg-[#111115]/95 border-[#53a759]/50 text-[#83da85]",
    info: "bg-[#111115]/95 border-[#00aaff]/50 text-[#00aaff]",
    error: "bg-[#111115]/95 border-[#ff5f52]/50 text-[#ff5f52]",
  };
  const iconos = { success: "check_circle", info: "info", error: "error" };
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-[13px] font-semibold transition-all duration-300 ${estilos[tipo] || estilos.success}`;
  toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${iconos[tipo] || "check_circle"}</span><span class="text-white">${mensaje}</span>`;
  cont.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

const COMMAND_PALETTE_MODULOS = [
  { nombre: "Inicio", url: "inicio.html", icono: "home", tags: "home resumen" },
  { nombre: "Agenda personal", url: "agenda-personal.html", icono: "calendar_month", tags: "eventos turnos" },
  { nombre: "Recordatorios diarios", url: "recordatorios-diarios.html", icono: "alarm", tags: "rutina hoy ayer" },
  { nombre: "Recordatorios varios", url: "recordatorios-varios.html", icono: "check_box", tags: "tareas pendientes" },
  { nombre: "Finanzas", url: "finanzas.html", icono: "account_balance_wallet", tags: "ingresos egresos tarjeta cuotas" },
  { nombre: "Salud", url: "salud.html", icono: "favorite", tags: "cuerpo ciclo mente energia sesiones" },
  { nombre: "Ocio", url: "ocio.html", icono: "local_library", tags: "libros series peliculas" },
  { nombre: "Gestión emocional", url: "gestion-emocional.html", icono: "psychology", tags: "emociones stop calma" },
  { nombre: "Relaciones y límites", url: "relaciones-y-limites.html", icono: "shield", tags: "limites afirmaciones frases" },
  { nombre: "Desarrollo personal", url: "desarrollo-personal.html", icono: "trending_up", tags: "comunicacion autoestima autoconocimiento" },
];

function inicializarCommandPalette() {
  if (typeof document === "undefined" || document.getElementById("cmd-palette-modal")) return;

  const modal = document.createElement("div");
  modal.id = "cmd-palette-modal";
  modal.className = "fixed inset-0 z-[80] hidden items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-20";
  modal.innerHTML = `
    <div class="w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.12] shadow-2xl overflow-hidden" onclick="event.stopPropagation()">
      <div class="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
        <span class="material-symbols-outlined text-[20px] text-[#ff5f52]">search</span>
        <input id="cmd-palette-input" type="text" placeholder="Ir a un módulo... (Ctrl+K · Esc para cerrar)" class="w-full bg-transparent text-white text-[14px] placeholder-[#8e8e93] focus:outline-none" />
        <kbd class="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-[#8e8e93] border border-white/[0.08]">ESC</kbd>
      </div>
      <div id="cmd-palette-list" class="max-h-72 overflow-y-auto p-2 space-y-1"></div>
    </div>
  `;
  modal.addEventListener("click", () => modal.classList.add("hidden"));
  document.body.appendChild(modal);

  const renderLista = (q = "") => {
    const term = q.trim().toLowerCase();
    const filtrados = COMMAND_PALETTE_MODULOS.filter((m) =>
      !term || `${m.nombre} ${m.tags}`.toLowerCase().includes(term)
    );
    const listEl = document.getElementById("cmd-palette-list");
    listEl.innerHTML = (filtrados.length === 0
      ? `<p class="text-xs text-[#8e8e93] text-center py-4">Sin coincidencias</p>`
      : filtrados.map((m) => `
          <a href="${m.url}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#e5e2e1] hover:bg-[#ff5f52]/15 hover:text-white transition-colors">
            <span class="material-symbols-outlined text-[18px] text-[#ff5f52]">${m.icono}</span>
            <span class="text-[13px] font-semibold flex-1">${m.nombre}</span>
            <span class="material-symbols-outlined text-[16px] text-[#8e8e93]">arrow_forward</span>
          </a>
        `).join("")) + (!term || "escanear foto ocr texto frase libro afirmacion".includes(term) ? `
          <button type="button" onclick="document.getElementById('cmd-palette-modal').classList.add('hidden'); abrirAccesoRapidoOCR();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#83da85] hover:bg-[#53a759]/15 transition-colors text-left">
            <span class="material-symbols-outlined text-[18px]">photo_camera</span>
            <span class="text-[13px] font-bold flex-1">Escanear foto / texto (OCR → Notion)</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#53a759]/20">Rápido</span>
          </button>` : "");
  };

  const abrir = () => {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    const inp = document.getElementById("cmd-palette-input");
    inp.value = "";
    renderLista("");
    setTimeout(() => inp.focus(), 20);
  };

  document.getElementById("cmd-palette-input").addEventListener("input", (e) => renderLista(e.target.value));
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (modal.classList.contains("hidden")) abrir();
      else { modal.classList.add("hidden"); modal.classList.remove("flex"); }
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      const formAbierto = document.querySelector(".fixed.flex form");
      if (formAbierto && typeof formAbierto.requestSubmit === "function") {
        e.preventDefault();
        formAbierto.requestSubmit();
      }
    } else if (e.key === "Escape") {
      if (!modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        return;
      }
      const modalesAbiertos = [...document.querySelectorAll(".fixed.flex[id^='modal-']")];
      if (modalesAbiertos.length > 0) {
        const ultimo = modalesAbiertos[modalesAbiertos.length - 1];
        if (ultimo.id !== "modal-spinner-notion") {
          ultimo.classList.add("hidden");
          ultimo.classList.remove("flex");
        }
      }
    }
  });

  if (!document.getElementById("btn-cmd-palette-hint")) {
    const btnHint = document.createElement("button");
    btnHint.id = "btn-cmd-palette-hint";
    btnHint.type = "button";
    btnHint.title = "Abrir buscador rápido (Ctrl + K)";
    btnHint.className = "hidden lg:inline-flex fixed bottom-5 left-5 z-30 items-center gap-2 px-3 py-1.5 rounded-full bg-[#111115]/90 border border-white/[0.1] text-[11px] text-[#8e8e93] hover:text-white hover:border-[#ff5f52]/40 backdrop-blur-md shadow-lg transition-all";
    btnHint.innerHTML = `<span class="material-symbols-outlined text-[15px] text-[#ff5f52]">search</span><span>Ir a...</span><kbd class="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px]">Ctrl+K</kbd>`;
    btnHint.addEventListener("click", abrir);
    document.body.appendChild(btnHint);
  }

  if (!document.getElementById("btn-ocr-rapido-fab")) {
    const btnOcr = document.createElement("button");
    btnOcr.id = "btn-ocr-rapido-fab";
    btnOcr.type = "button";
    btnOcr.title = "Escanear foto o texto para Notion";
    btnOcr.className = "fixed bottom-5 right-5 z-30 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#111115]/95 border border-[#53a759]/40 text-xs font-bold text-[#83da85] hover:bg-[#53a759]/20 backdrop-blur-md shadow-xl transition-all";
    btnOcr.innerHTML = `<span class="material-symbols-outlined text-[18px]">photo_camera</span><span>Escanear</span>`;
    btnOcr.addEventListener("click", abrirAccesoRapidoOCR);
    document.body.appendChild(btnOcr);
  }
}

function abrirAccesoRapidoOCR() {
  if (typeof abrirEscanerOCR === "function") {
    abrirEscanerOCR();
    return;
  }
  const s = document.createElement("script");
  s.src = "./src/utils/ocr_scanner.js";
  s.onload = () => { if (typeof abrirEscanerOCR === "function") abrirEscanerOCR(); };
  document.head.appendChild(s);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    inicializarCommandPalette();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderizarFilasEstados,
    renderizarTareasSinEmpezar,
    renderizarTareasDiariasConEstado,
    toggleBloque,
    renderizarRecordatoriosVarios,
    formatHora,
    renderizarAgendaEventos,
    crearManejadorDeRefresco,
    mostrarToast,
    COMMAND_PALETTE_MODULOS,
    inicializarCommandPalette,
  };
}
