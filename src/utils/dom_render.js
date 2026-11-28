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
      ? `<div class="flex items-center gap-1.5 flex-shrink-0">
            <select onchange="cambiarEstadoTareaDiaria('${escapeHtml(t.id)}', '${escapeHtml(t.tipo_estado || "status")}', this)"
                aria-label="Estado de ${escapeHtml(t.nombre || "tarea")}"
                class="bg-[#141416] border border-[#232326] rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-primary-container max-w-[155px]">
                ${optionsHtml}
            </select>
            <button type="button" onclick="if(typeof abrirModalEditarTareaDiaria==='function')abrirModalEditarTareaDiaria('${escapeHtml(t.id)}')"
                class="p-1.5 hover:bg-white/10 rounded-lg text-[#8e8e93] hover:text-white transition-colors"
                title="Editar tarea" aria-label="Editar tarea">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
        </div>`
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
    container.innerHTML = `<div class="status-row flex flex-col items-center justify-center text-center py-5 px-4 gap-1.5">
        <span class="text-[#8e8e93] text-[13px] font-medium">Sin recordatorios registrados · Bandeja limpia y en calma 🌿</span>
        <span class="text-[#6b7280] text-[11px]">Buen momento para respirar tranquila sin sobrecarga visual.</span>
    </div>`;
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
    const subtituloVacio = prefijo === "eventos-manana"
      ? "Tu energía somática queda libre para descanso, introspección o creación sin presiones."
      : "No hay compromisos en este bloque. Podés programar uno cuando lo necesites.";
    container.innerHTML = `<div class="status-row left-pill-blue flex flex-col items-center justify-center text-center py-5 px-4 gap-1.5">
        <span class="text-[#e5e2e1] text-[13px] font-semibold">Sin eventos registrados · Agenda despejada en este bloque ✨</span>
        <span class="text-[#8e8e93] text-[11px] max-w-md">${subtituloVacio}</span>
    </div>`;
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
            <button type="button" onclick="if (typeof abrirModalDetalleEvento === 'function') abrirModalDetalleEvento('${escapeHtml(prefijo)}', ${idx})"
                class="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[#8e8e93] hover:text-white"
                title="Ver detalle del evento" aria-label="Ver detalle del evento">
                <span class="material-symbols-outlined text-[18px]">visibility</span>
            </button>
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
            <div onclick="if (typeof abrirModalDetalleEvento === 'function') abrirModalDetalleEvento('${escapeHtml(prefijo)}', ${idx})" class="flex flex-col gap-1 min-w-0 flex-1 cursor-pointer group">
                <span class="text-white font-semibold truncate group-hover:text-[#ffb4aa] transition-colors">${escapeHtml(item.nombre || "Sin nombre")}</span>
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
  { nombre: "Hábitos y disciplina", url: "habitos-y-disciplina.html", icono: "local_fire_department", tags: "habitos disciplina formaciones cursos racha" },
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
    const accionesExtra = [
      { id: "ocr", match: "escanear foto ocr texto frase libro afirmacion", icon: "photo_camera", color: "text-[#83da85]", label: "Escanear foto / texto (OCR → Notion)", badge: "Rápido", fn: "abrirAccesoRapidoOCR()" },
      { id: "focus", match: "focus zen atajos teclado shortcuts", icon: "center_focus_strong", color: "text-[#00aaff]", label: "Atajos de teclado & Modo Focus / Zen", badge: "Shift+?", fn: "abrirModalAtajosFocus()" },
      { id: "notif", match: "notificaciones somaticas feed avisos drawer campana", icon: "notifications", color: "text-[#ff5f52]", label: "Centro de Notificaciones Somáticas", badge: "Ctrl+Shift+N", fn: "abrirDrawerNotificaciones()" },
      { id: "export", match: "exportar reporte pdf markdown clinico financiero", icon: "download", color: "text-[#ffb961]", label: "Centro de Exportación (PDF / Markdown)", badge: "Reporte", fn: "abrirCentroExportacion()" },
      { id: "pin", match: "pin bloqueo seguridad candado perfil", icon: "lock", color: "text-[#a855f7]", label: "Bloqueo PIN de privacidad", badge: "PIN", fn: "abrirModalPin()" },
    ].filter((a) => !term || a.match.includes(term));

    listEl.innerHTML = (filtrados.length === 0 && accionesExtra.length === 0
      ? `<p class="text-xs text-[#8e8e93] text-center py-4">Sin coincidencias</p>`
      : filtrados.map((m) => `
          <a href="${m.url}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#e5e2e1] hover:bg-[#ff5f52]/15 hover:text-white transition-colors">
            <span class="material-symbols-outlined text-[18px] text-[#ff5f52]">${m.icono}</span>
            <span class="text-[13px] font-semibold flex-1">${m.nombre}</span>
            <span class="material-symbols-outlined text-[16px] text-[#8e8e93]">arrow_forward</span>
          </a>
        `).join("")) + accionesExtra.map((a) => `
          <button type="button" onclick="document.getElementById('cmd-palette-modal').classList.add('hidden'); ${a.fn};" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${a.color} hover:bg-white/[0.06] transition-colors text-left">
            <span class="material-symbols-outlined text-[18px]">${a.icon}</span>
            <span class="text-[13px] font-bold flex-1">${a.label}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08]">${a.badge}</span>
          </button>
        `).join("");
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

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "h") {
      e.preventDefault();
      window.location.href = "inicio.html";
    } else if (e.altKey && /^[1-9]$/.test(e.key)) {
      const mod = COMMAND_PALETTE_MODULOS[Number(e.key) - 1];
      if (mod) { e.preventDefault(); window.location.href = mod.url; }
    } else if (e.shiftKey && e.key === "?" && !["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement || {}).tagName)) {
      e.preventDefault();
      abrirModalAtajosFocus();
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      abrirDrawerNotificaciones();
    }
  });
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

const FOCUS_STORAGE_KEY = "asistente_sabry:focus_mode";
const PIN_STORAGE_KEY = "asistente_sabry:pin_code";

function aplicarModoFocus() {
  if (typeof document === "undefined") return false;
  let activo = false;
  try { activo = localStorage.getItem(FOCUS_STORAGE_KEY) === "1"; } catch (e) {}
  document.body.classList.toggle("focus-mode-active", activo);
  ["btn-ocr-rapido-fab", "btn-cmd-palette-hint"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("opacity-25", activo);
  });
  return activo;
}

function toggleModoFocus(forzar) {
  let actual = false;
  try { actual = localStorage.getItem(FOCUS_STORAGE_KEY) === "1"; } catch (e) {}
  const nuevo = typeof forzar === "boolean" ? forzar : !actual;
  try { localStorage.setItem(FOCUS_STORAGE_KEY, nuevo ? "1" : "0"); } catch (e) {}
  aplicarModoFocus();
  if (typeof mostrarToast === "function") {
    mostrarToast(nuevo ? "Modo Focus / Zen activado" : "Modo Focus desactivado", "info");
  }
  return nuevo;
}

function abrirModalAtajosFocus() {
  if (typeof document === "undefined") return;
  let modal = document.getElementById("modal-atajos-focus");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-atajos-focus";
    modal.className = "fixed inset-0 z-[82] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-5 shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-label-caps text-[#00aaff] tracking-widest">PRODUCTIVIDAD WINDOWS</p>
            <h3 class="text-lg font-bold text-white">Atajos de Teclado &amp; Modo Focus</h3>
          </div>
          <button type="button" onclick="document.getElementById('modal-atajos-focus').classList.add('hidden')" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]"><span class="material-symbols-outlined text-[20px]">close</span></button>
        </div>
        <div class="flex items-center justify-between p-4 rounded-xl bg-[#18181d] border border-white/[0.08]">
          <div>
            <p class="text-sm font-bold text-white">Modo Focus / Zen</p>
            <p class="text-xs text-[#8e8e93]">Atenúa botones flotantes para reducir sobrecarga visual.</p>
          </div>
          <button id="btn-toggle-focus-modal" type="button" onclick="toggleModoFocus(); actualizarTextoFocusModal();" class="px-3.5 py-2 rounded-xl bg-[#00aaff]/20 text-[#00aaff] border border-[#00aaff]/40 text-xs font-bold">Activar</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Buscador rápido</span><kbd class="text-white font-bold">Ctrl + K</kbd></div>
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Ir a Inicio</span><kbd class="text-white font-bold">Alt + H</kbd></div>
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Saltar a módulo 1–9</span><kbd class="text-white font-bold">Alt + 1..9</kbd></div>
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Guardar modal activo</span><kbd class="text-white font-bold">Ctrl + Enter</kbd></div>
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Cerrar modal</span><kbd class="text-white font-bold">Esc</kbd></div>
          <div class="flex justify-between p-2.5 rounded-lg bg-[#08080a] border border-white/[0.06]"><span class="text-[#a1a1aa]">Este panel</span><kbd class="text-white font-bold">Shift + ?</kbd></div>
        </div>
      </div>
    `;
    modal.addEventListener("click", () => { modal.classList.add("hidden"); modal.classList.remove("flex"); });
    document.body.appendChild(modal);
  }
  window.actualizarTextoFocusModal = () => {
    const activo = document.body.classList.contains("focus-mode-active");
    const b = document.getElementById("btn-toggle-focus-modal");
    if (b) b.textContent = activo ? "Desactivar" : "Activar";
  };
  window.actualizarTextoFocusModal();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function generarReporteSaludMarkdown(ciclo = [], sesiones = [], pendientes = []) {
  const ultCiclo = (ciclo || []).slice(0, 6);
  const ultSes = (sesiones || []).slice(0, 8);
  const pend = (pendientes || []).slice(0, 10);
  const lines = ["# Reporte Clínico y Somático — AsistenteSabry", ""];
  lines.push("## Ciclo Menstrual (fases recientes)");
  if (ultCiclo.length === 0) lines.push("- Sin registros.");
  ultCiclo.forEach((f) => {
    const sin = (f.sintomas || []).length ? ` | Síntomas: ${f.sintomas.join(", ")}` : "";
    lines.push(`- **${f.nombre || "Fase"}**: ${f.inicio || "?"}${f.fin ? " a " + f.fin : ""}${sin}`);
  });
  lines.push("", "## Controles y Pendientes Médicos");
  if (pend.length === 0) lines.push("- Sin pendientes activos.");
  pend.forEach((p) => lines.push(`- ${p.nombre} (${p.estado || "Pendiente"}${p.fecha_limite ? " · " + p.fecha_limite : ""})`));
  lines.push("", "## Diario de Sesiones");
  if (ultSes.length === 0) lines.push("- Sin sesiones registradas.");
  ultSes.forEach((s) => lines.push(`- ${s.fecha || ""} · **${s.nombre}** (${s.duracion || 0} min · ${s.estado || ""})`));
  return lines.join("\n");
}

function generarReporteFinanzasMarkdown(mes = "", ingresos = [], egresos = [], cuotas = []) {
  const totIng = (ingresos || []).reduce((a, b) => a + (Number(b.monto) || 0), 0);
  const totEgr = (egresos || []).reduce((a, b) => a + (Number(b.monto) || 0), 0);
  const totCuotas = (cuotas || []).reduce((a, b) => a + (Number(b.monto) || 0), 0);
  const lines = [
    `# Reporte Financiero (${mes || "Mes actual"}) — AsistenteSabry`,
    "",
    `- **Total Ingresos**: $ ${totIng.toFixed(2)}`,
    `- **Total Egresos**: $ ${totEgr.toFixed(2)}`,
    `- **Balance**: $ ${(totIng - totEgr).toFixed(2)}`,
    `- **Cuotas TC pendientes registradas**: $ ${totCuotas.toFixed(2)} (${(cuotas || []).length} cuotas)`,
    "",
    "## Egresos recientes",
  ];
  (egresos || []).slice(0, 12).forEach((e) => lines.push(`- ${e.fecha || ""} · **${e.nombre}**: $ ${(Number(e.monto) || 0).toFixed(2)}`));
  return lines.join("\n");
}

function abrirCentroExportacion() {
  if (typeof document === "undefined") return;
  let modal = document.getElementById("modal-export-center");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-export-center";
    modal.className = "fixed inset-0 z-[82] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-xl rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-label-caps text-[#ffb961] tracking-widest">ZERO-LEAK EXPORT</p>
            <h3 class="text-lg font-bold text-white">Centro de Exportación (PDF / Markdown)</h3>
          </div>
          <button type="button" onclick="document.getElementById('modal-export-center').classList.add('hidden')" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]"><span class="material-symbols-outlined text-[20px]">close</span></button>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="cargarPreviewExport('salud')" class="px-3 py-1.5 rounded-lg bg-[#ff5f52]/15 text-[#ff5f52] border border-[#ff5f52]/30 text-xs font-bold">Reporte Clínico / Salud</button>
          <button type="button" onclick="cargarPreviewExport('finanzas')" class="px-3 py-1.5 rounded-lg bg-[#ffb961]/15 text-[#ffb961] border border-[#ffb961]/30 text-xs font-bold">Reporte Financiero</button>
        </div>
        <textarea id="export-md-preview" rows="10" readonly class="w-full bg-[#08080a] border border-white/[0.08] rounded-xl p-3 text-xs text-[#e5e2e1] font-mono"></textarea>
        <div class="flex gap-2.5">
          <button type="button" onclick="copiarExportMarkdown()" class="flex-1 bg-[#1c1c1f] hover:bg-[#232326] text-white font-bold text-xs py-2.5 rounded-xl">Copiar Markdown</button>
          <button type="button" onclick="window.print()" class="flex-1 bg-[#ffb961] hover:bg-[#ffb961]/90 text-[#111115] font-bold text-xs py-2.5 rounded-xl">Imprimir / Guardar PDF (Ctrl+P)</button>
        </div>
      </div>
    `;
    modal.addEventListener("click", () => { modal.classList.add("hidden"); modal.classList.remove("flex"); });
    document.body.appendChild(modal);
  }
  window.cargarPreviewExport = (tipo) => {
    const md = tipo === "finanzas"
      ? generarReporteFinanzasMarkdown(
          typeof finanzasMesActual !== "undefined" ? finanzasMesActual : "",
          typeof finanzasIngresos !== "undefined" ? finanzasIngresos : [],
          typeof finanzasEgresos !== "undefined" ? finanzasEgresos : [],
          typeof finanzasCuotas !== "undefined" ? finanzasCuotas : []
        )
      : generarReporteSaludMarkdown(
          typeof saludCiclo !== "undefined" ? saludCiclo : (typeof inicioCiclo !== "undefined" ? inicioCiclo : []),
          typeof saludSesiones !== "undefined" ? saludSesiones : [],
          typeof saludPendientes !== "undefined" ? saludPendientes : []
        );
    document.getElementById("export-md-preview").value = md;
  };
  window.copiarExportMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("export-md-preview").value);
      if (typeof mostrarToast === "function") mostrarToast("Reporte copiado en Markdown", "success");
    } catch (e) {}
  };
  window.cargarPreviewExport(typeof finanzasIngresos !== "undefined" ? "finanzas" : "salud");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function inicializarResguardoOffline() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const actualizar = () => {
    let banner = document.getElementById("offline-resguardo-banner");
    if (navigator.onLine === false) {
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "offline-resguardo-banner";
        banner.className = "fixed top-3 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full bg-[#1c1c1f]/95 border border-[#ffb961]/50 text-[#ffb961] text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2";
        banner.innerHTML = `<span class="material-symbols-outlined text-[16px]">cloud_off</span><span>Modo Resguardo Offline · Mostrando última copia sincronizada</span>`;
        document.body.appendChild(banner);
      }
      banner.classList.remove("hidden");
    } else if (banner) {
      banner.classList.add("hidden");
    }
  };
  window.addEventListener("offline", actualizar);
  window.addEventListener("online", actualizar);
  actualizar();
}

function verificarPinLocal(ingresado, guardado) {
  return String(ingresado || "").trim() !== "" && String(ingresado || "").trim() === String(guardado || "").trim();
}

function abrirModalPin() {
  if (typeof document === "undefined") return;
  let pinActual = "";
  try { pinActual = localStorage.getItem(PIN_STORAGE_KEY) || ""; } catch (e) {}
  let modal = document.getElementById("modal-pin-lock");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-pin-lock";
    modal.className = "fixed inset-0 z-[95] hidden items-center justify-center bg-black/90 backdrop-blur-xl p-4";
    modal.innerHTML = `
      <div class="w-full max-w-xs rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-4 text-center shadow-2xl" onclick="event.stopPropagation()">
        <span class="material-symbols-outlined text-[36px] text-[#ff5f52]">lock</span>
        <h3 id="pin-modal-titulo" class="text-base font-bold text-white">Bloqueo de Privacidad</h3>
        <p id="pin-modal-desc" class="text-xs text-[#8e8e93]">Ingresá tu PIN de 4 dígitos</p>
        <input id="pin-input" type="password" inputmode="numeric" maxlength="8" placeholder="••••" class="w-full text-center tracking-[0.5em] bg-[#1c1c1f] border border-[#232326] rounded-xl px-3 py-2.5 text-white text-lg" />
        <p id="pin-error" class="text-xs text-[#ff5f52] hidden"></p>
        <div class="flex gap-2">
          <button id="pin-btn-cancelar" type="button" onclick="document.getElementById('modal-pin-lock').classList.add('hidden')" class="flex-1 bg-[#1c1c1f] text-white text-xs font-semibold py-2.5 rounded-xl">Cancelar</button>
          <button id="pin-btn-ok" type="button" class="flex-1 bg-[#ff5f52] text-white text-xs font-bold py-2.5 rounded-xl">Confirmar</button>
        </div>
        <button id="pin-btn-quitar" type="button" class="hidden w-full text-[11px] text-[#8e8e93] hover:text-white underline">Quitar PIN guardado</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const inp = document.getElementById("pin-input");
  const err = document.getElementById("pin-error");
  const btnCancel = document.getElementById("pin-btn-cancelar");
  const btnQuitar = document.getElementById("pin-btn-quitar");
  inp.value = "";
  err.classList.add("hidden");

  if (!pinActual) {
    document.getElementById("pin-modal-titulo").textContent = "Configurar PIN de Privacidad";
    document.getElementById("pin-modal-desc").textContent = "Elegí un PIN de 4 dígitos para bloquear la pantalla cuando quieras.";
    btnCancel.classList.remove("hidden");
    btnQuitar.classList.add("hidden");
    document.getElementById("pin-btn-ok").onclick = () => {
      const val = inp.value.trim();
      if (val.length < 4) { err.textContent = "Mínimo 4 dígitos."; err.classList.remove("hidden"); return; }
      try { localStorage.setItem(PIN_STORAGE_KEY, val); } catch (e) {}
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      if (typeof mostrarToast === "function") mostrarToast("PIN configurado. Tocá 🔒 para bloquear.", "success");
    };
  } else {
    document.getElementById("pin-modal-titulo").textContent = "Pantalla Bloqueada";
    document.getElementById("pin-modal-desc").textContent = "Ingresá tu PIN para continuar.";
    btnCancel.classList.add("hidden");
    btnQuitar.classList.remove("hidden");
    document.getElementById("pin-btn-ok").onclick = () => {
      if (verificarPinLocal(inp.value, pinActual)) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      } else {
        err.textContent = "PIN incorrecto.";
        err.classList.remove("hidden");
      }
    };
    btnQuitar.onclick = () => {
      if (verificarPinLocal(inp.value, pinActual)) {
        try { localStorage.removeItem(PIN_STORAGE_KEY); } catch (e) {}
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        if (typeof mostrarToast === "function") mostrarToast("PIN eliminado", "info");
      } else {
        err.textContent = "Ingresá el PIN actual para quitarlo.";
        err.classList.remove("hidden");
      }
    };
  }
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  setTimeout(() => inp.focus(), 20);
}

function construirNotificacionesContextuales(ctx = {}) {
  const items = [];
  const ciclo = Array.isArray(ctx.ciclo) ? ctx.ciclo : [];
  if (ciclo.length > 0 && ciclo[0].nombre) {
    items.push({
      categoria: "biologica",
      titulo: `Ritmo Biológico: ${ciclo[0].nombre}`,
      detalle: ciclo[0].proximo_inicio ? `Próxima etapa estimada: ${ciclo[0].proximo_inicio}` : "Seguimiento activo en Salud.",
      color: "text-[#ff5f52]",
      icono: "favorite",
    });
  }
  const pendientes = Array.isArray(ctx.pendientesSalud) ? ctx.pendientesSalud : [];
  const conRetraso = pendientes.filter((p) => p.con_retraso);
  if (conRetraso.length > 0) {
    items.push({
      categoria: "biologica",
      titulo: `${conRetraso.length} control(es) médico(s) con retraso`,
      detalle: conRetraso.slice(0, 2).map((p) => p.nombre).join(", "),
      color: "text-[#ffb961]",
      icono: "medical_services",
    });
  }
  if (ctx.timestampLocalStr) {
    items.push({
      categoria: "notion",
      titulo: "Sincronización Notion Hub al día",
      detalle: `Última: ${ctx.timestampLocalStr}${ctx.timestampNextStr ? " · Próx: " + ctx.timestampNextStr : ""}`,
      color: "text-[#83da85]",
      icono: "cloud_done",
    });
  }
  if (ctx.online === false) {
    items.push({
      categoria: "notion",
      titulo: "Modo Resguardo Offline activo",
      detalle: "Mostrando última copia local sincronizada.",
      color: "text-[#ffb961]",
      icono: "cloud_off",
    });
  }
  const cuotas = Array.isArray(ctx.cuotas) ? ctx.cuotas : [];
  if (cuotas.length > 0) {
    items.push({
      categoria: "finanzas",
      titulo: `${cuotas.length} cuota(s) TC en seguimiento`,
      detalle: "Revisá la proyección a 6 meses en Finanzas.",
      color: "text-[#00aaff]",
      icono: "credit_card",
    });
  }
  return items;
}

function abrirDrawerNotificaciones() {
  if (typeof document === "undefined") return;
  let drawer = document.getElementById("drawer-notificaciones");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = "drawer-notificaciones";
    drawer.className = "fixed inset-0 z-[84] hidden justify-end bg-black/65 backdrop-blur-sm";
    drawer.innerHTML = `
      <aside class="w-full max-w-sm h-full bg-[#111115] border-l border-white/[0.1] p-6 flex flex-col gap-4 shadow-2xl overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-label-caps text-[#ff5f52] tracking-widest">FEED SOMÁTICO &amp; NOTION</p>
            <h3 class="text-lg font-bold text-white">Notificaciones</h3>
          </div>
          <button type="button" onclick="document.getElementById('drawer-notificaciones').classList.add('hidden')" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]"><span class="material-symbols-outlined text-[20px]">close</span></button>
        </div>
        <div class="flex flex-wrap gap-1.5 text-xs">
          <button type="button" onclick="renderNotifDrawer('todas')" class="px-2.5 py-1 rounded-lg bg-[#ff5f52]/20 text-[#ff5f52] font-bold">Todas</button>
          <button type="button" onclick="renderNotifDrawer('biologica')" class="px-2.5 py-1 rounded-lg bg-[#1c1c1f] text-[#a1a1aa] hover:text-white">Biológicas</button>
          <button type="button" onclick="renderNotifDrawer('notion')" class="px-2.5 py-1 rounded-lg bg-[#1c1c1f] text-[#a1a1aa] hover:text-white">Notion</button>
        </div>
        <div id="drawer-notif-list" class="space-y-2.5 flex-1"></div>
        <div class="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
          <span class="text-[#a1a1aa]">Foco Profundo Somático</span>
          <button type="button" onclick="toggleModoFocus()" class="px-3 py-1.5 rounded-lg bg-[#00aaff]/15 text-[#00aaff] font-bold">Alternar Focus</button>
        </div>
      </aside>
    `;
    drawer.addEventListener("click", () => { drawer.classList.add("hidden"); drawer.classList.remove("flex"); });
    document.body.appendChild(drawer);
  }
  window.renderNotifDrawer = (cat = "todas") => {
    const items = construirNotificacionesContextuales({
      ciclo: typeof saludCiclo !== "undefined" ? saludCiclo : (typeof inicioCiclo !== "undefined" ? inicioCiclo : []),
      pendientesSalud: typeof saludPendientes !== "undefined" ? saludPendientes : [],
      timestampLocalStr: typeof timestampLocalStr !== "undefined" ? timestampLocalStr : "",
      timestampNextStr: typeof timestampNextStr !== "undefined" ? timestampNextStr : "",
      cuotas: typeof finanzasCuotas !== "undefined" ? finanzasCuotas : [],
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    }).filter((x) => cat === "todas" || x.categoria === cat);
    const list = document.getElementById("drawer-notif-list");
    list.innerHTML = items.length === 0
      ? `<p class="text-xs text-[#8e8e93] text-center py-6">Sin avisos en esta categoría 🌿</p>`
      : items.map((n) => `
          <div class="p-3.5 rounded-xl bg-[#18181d] border border-white/[0.06] flex items-start gap-3">
            <span class="material-symbols-outlined text-[18px] ${n.color} mt-0.5">${n.icono}</span>
            <div class="min-w-0">
              <p class="text-xs font-bold text-white">${n.titulo}</p>
              <p class="text-[11px] text-[#8e8e93] mt-0.5">${n.detalle}</p>
            </div>
          </div>
        `).join("");
  };
  window.renderNotifDrawer("todas");
  drawer.classList.remove("hidden");
  drawer.classList.add("flex");
}

function inicializarBloqueoPin() {
  if (typeof document === "undefined") return;
  const sidebar = document.getElementById("sidebar");
  if (!sidebar || document.getElementById("btn-sidebar-pin")) return;
  const perfil = sidebar.querySelector(".border-t");
  if (perfil) {
    const btn = document.createElement("button");
    btn.id = "btn-sidebar-pin";
    btn.type = "button";
    btn.title = "Bloqueo PIN";
    btn.className = "ml-auto p-1.5 rounded-lg hover:bg-white/10 text-[#8e8e93] hover:text-[#ff5f52] transition-colors";
    btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">lock</span>`;
    btn.addEventListener("click", abrirModalPin);
    perfil.appendChild(btn);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    inicializarCommandPalette();
    aplicarModoFocus();
    inicializarResguardoOffline();
    inicializarBloqueoPin();
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
    aplicarModoFocus,
    toggleModoFocus,
    generarReporteSaludMarkdown,
    generarReporteFinanzasMarkdown,
    verificarPinLocal,
    construirNotificacionesContextuales,
  };
}
