/**
 * Somatic Shell (Obsidian Metric System) — Capa transversal sin dependencias:
 * - Command Palette Spotlight (Ctrl + K)
 * - Drawer de Notificaciones Somáticas (Ctrl + Shift + N) + Estado Vacío (Mini Pausa 60s)
 * - Modal de Preferencias de Alertas Somáticas (Cero Culpa, Blindaje Nocturno, Protección Lútea)
 * - Modal de Atajos de Teclado & Modo Focus (Ctrl + /)
 * - Resguardo Offline (banner no alarmista) + Exportación Markdown / PDF
 */
(function (global) {
  "use strict";

  const PREFS_KEY = "asistente_sabry:somatic_prefs";
  const FOCUS_KEY = "asistente_sabry:focus_mode";
  const NOTIF_KEY = "asistente_sabry:somatic_notifs_v1";

  const MODULOS_NAVEGACION = [
    { titulo: "Inicio", desc: "Centro de control diario y ritmo biológico", href: "inicio.html", icon: "home" },
    { titulo: "Agenda personal", desc: "Eventos de hoy, mañana y ayer", href: "agenda-personal.html", icon: "calendar_month" },
    { titulo: "Recordatorios diarios", desc: "Consistencia operativa y métricas", href: "recordatorios-diarios.html", icon: "alarm" },
    { titulo: "Recordatorios varios", desc: "Pendientes y backlog general", href: "recordatorios-varios.html", icon: "check_box" },
    { titulo: "Finanzas", desc: "Ingresos, egresos y proyección cuotas TC", href: "finanzas.html", icon: "account_balance_wallet" },
    { titulo: "Salud", desc: "Cuerpo, ciclo menstrual, mente y energía", href: "salud.html", icon: "favorite" },
    { titulo: "Ocio", desc: "Libros, series y películas (Notion Hub)", href: "ocio.html", icon: "local_library" },
    { titulo: "Gestión emocional", desc: "Barómetro, Protocolo S.T.O.P. y herramientas", href: "gestion-emocional.html", icon: "psychology" },
    { titulo: "Relaciones y límites", desc: "Afirmaciones y frases asertivas CNV", href: "relaciones-y-limites.html", icon: "shield" },
    { titulo: "Desarrollo personal", desc: "Comunicación, autoestima y autoconocimiento", href: "desarrollo-personal.html", icon: "trending_up" },
    { titulo: "Hábitos y disciplina", desc: "Rachas semanales y aprendizaje continuo", href: "habitos-y-disciplina.html", icon: "local_fire_department" },
    { titulo: "Contras AI Studio", desc: "Acceso externo en nueva pestaña", href: "https://contras.ai.studio/", icon: "open_in_new", externo: true },
  ];

  const PREFS_DEFAULT = {
    transicionHormonal: true,
    sobrecargaVFC: true,
    hidratacion: true,
    tensionCervical: true,
    loteCompasivo: true,
    ceroCulpa: true,
    blindajeNocturno: true,
    proteccionLutea: true,
    focoProfundo: false,
  };

  const NOTIFS_DEFAULT = [
    { id: "n-bio-1", cat: "Biológicas", titulo: "Recordatorio de hidratación & enraizamiento", detalle: "Tomá un vaso de agua tibia y soltá los hombros 30 segundos.", hora: "Hoy" },
    { id: "n-notion-1", cat: "Notion Sync", titulo: "Sincronización horaria Notion activa", detalle: "Tus tableros se actualizan cada hora en punto (ART).", hora: "Auto" },
    { id: "n-hab-1", cat: "Hábitos", titulo: "Pausa consciente sugerida", detalle: "Si sentís carga cognitiva, abrí el Protocolo S.T.O.P. en Gestión emocional.", hora: "Sugerencia" },
  ];

  function leerPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...PREFS_DEFAULT, ...JSON.parse(raw) } : { ...PREFS_DEFAULT };
    } catch (e) {
      return { ...PREFS_DEFAULT };
    }
  }

  function guardarPrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function leerNotifs() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {}
    return [...NOTIFS_DEFAULT];
  }

  function guardarNotifs(lista) {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(lista)); } catch (e) {}
  }

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function _initSidebarColapsable() {
    if (typeof document === "undefined") return;
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    if (!document.getElementById("ss-sidebar-style")) {
      const style = document.createElement("style");
      style.id = "ss-sidebar-style";
      style.textContent = `
        @media (min-width: 1024px) {
          body.ss-sidebar-collapsed #sidebar { width: 72px !important; padding-left: 0.625rem !important; padding-right: 0.625rem !important; align-items: center; }
          body.ss-sidebar-collapsed #sidebar > div:first-child { justify-content: center; padding-left: 0; padding-right: 0; width: 100%; }
          body.ss-sidebar-collapsed #sidebar > div:first-child > div:nth-child(2) { display: none; }
          body.ss-sidebar-collapsed #sidebar nav { width: 100%; }
          body.ss-sidebar-collapsed #sidebar nav a,
          body.ss-sidebar-collapsed #sidebar a[href*="contras"] { justify-content: center; padding-left: 0.5rem; padding-right: 0.5rem; }
          body.ss-sidebar-collapsed #sidebar nav a span:not(.material-symbols-outlined),
          body.ss-sidebar-collapsed #sidebar a[href*="contras"] span:not(.material-symbols-outlined) { display: none; }
          body.ss-sidebar-collapsed #sidebar > div:last-child { justify-content: center; padding-left: 0; padding-right: 0; }
          body.ss-sidebar-collapsed #sidebar > div:last-child > div:nth-child(2) { display: none; }
          body.ss-sidebar-collapsed main { margin-left: 72px !important; }
        }
      `;
      document.head.appendChild(style);
    }

    const headerRow = sidebar.firstElementChild;
    if (headerRow && !document.getElementById("ss-btn-collapse-sidebar")) {
      const btn = document.createElement("button");
      btn.id = "ss-btn-collapse-sidebar";
      btn.type = "button";
      btn.className = "hidden lg:inline-flex ml-auto p-1.5 rounded-lg text-[#8e8e93] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0";
      btn.title = "Colapsar / expandir barra lateral";
      btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">dock_to_left</span>`;
      btn.addEventListener("click", () => {
        const next = !document.body.classList.contains("ss-sidebar-collapsed");
        document.body.classList.toggle("ss-sidebar-collapsed", next);
        try { localStorage.setItem("asistente_sabry:sidebar_collapsed", next ? "1" : "0"); } catch (e) {}
      });
      headerRow.appendChild(btn);
    }

    try {
      if (localStorage.getItem("asistente_sabry:sidebar_collapsed") === "1") {
        document.body.classList.add("ss-sidebar-collapsed");
      }
    } catch (e) {}
  }

  function _injectShell() {
    if (typeof document === "undefined" || document.getElementById("somatic-shell-root")) return;
    _initSidebarColapsable();

    const root = document.createElement("div");
    root.id = "somatic-shell-root";
    root.innerHTML = `
      <!-- BANNER OFFLINE NO ALARMISTA -->
      <div id="ss-offline-banner" class="hidden fixed top-3 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-[#18181d] border border-[#ffb961]/40 text-[#ffb961] text-xs font-semibold shadow-xl flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">cloud_off</span>
        <span>Modo de Resguardo Offline · Tus borradores locales siguen protegidos</span>
      </div>

      <!-- BARRA FLOTANTE COMPACTA (BOTTOM RIGHT) -->
      <div id="ss-dock" class="fixed bottom-4 right-4 z-[45] flex items-center gap-1.5 p-1.5 rounded-full bg-[#111115]/95 border border-white/[0.12] backdrop-blur-xl shadow-2xl">
        <button type="button" onclick="window.SomaticShell.abrirSpotlight()" class="px-2.5 py-1.5 rounded-full hover:bg-white/[0.08] text-[#e5e2e1] text-[11px] font-semibold flex items-center gap-1" title="Command Palette (Ctrl + K)">
          <span class="material-symbols-outlined text-[15px] text-[#ff5f52]">search</span>
          <span class="hidden sm:inline">Ctrl+K</span>
        </button>
        <button type="button" onclick="window.SomaticShell.abrirNotificaciones()" class="p-1.5 rounded-full hover:bg-white/[0.08] text-[#83da85] flex items-center" title="Notificaciones Somáticas (Ctrl + Shift + N)">
          <span class="material-symbols-outlined text-[17px]">notifications_active</span>
        </button>
        <button type="button" onclick="window.SomaticShell.abrirPreferencias()" class="p-1.5 rounded-full hover:bg-white/[0.08] text-[#ffb961] flex items-center" title="Preferencias Somáticas">
          <span class="material-symbols-outlined text-[17px]">tune</span>
        </button>
        <button type="button" onclick="window.SomaticShell.abrirAtajos()" class="p-1.5 rounded-full hover:bg-white/[0.08] text-[#a855f7] flex items-center" title="Atajos & Modo Focus (Ctrl + /)">
          <span class="material-symbols-outlined text-[17px]">keyboard</span>
        </button>
        <button type="button" onclick="if (typeof abrirAccesoRapidoOCR === 'function') abrirAccesoRapidoOCR()" class="p-1.5 rounded-full hover:bg-white/[0.08] text-[#83da85] flex items-center" title="Escanear foto o texto para Notion">
          <span class="material-symbols-outlined text-[17px]">photo_camera</span>
        </button>
        <button type="button" onclick="window.SomaticShell.abrirExportar()" class="p-1.5 rounded-full hover:bg-white/[0.08] text-[#38bdf8] flex items-center" title="Exportar Resumen">
          <span class="material-symbols-outlined text-[17px]">ios_share</span>
        </button>
      </div>

      <!-- COMMAND PALETTE SPOTLIGHT (CTRL + K) -->
      <div id="ss-modal-spotlight" class="fixed inset-0 z-[65] hidden items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-20" onclick="window.SomaticShell.cerrarTodo()">
        <div class="w-full max-w-xl rounded-2xl bg-[#111115] border border-white/[0.12] shadow-2xl overflow-hidden" onclick="event.stopPropagation()">
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
            <span class="material-symbols-outlined text-[#ff5f52] text-[20px]">search</span>
            <input id="ss-spotlight-input" type="text" placeholder="Ir a módulo o ejecutar acción (Ctrl + K)..." class="w-full bg-transparent text-white text-[14px] outline-none placeholder-[#8e8e93]" oninput="window.SomaticShell._filtrarSpotlight()" />
            <span class="text-[10px] text-[#8e8e93] px-2 py-0.5 rounded bg-white/[0.06]">ESC</span>
          </div>
          <div id="ss-spotlight-list" class="max-h-80 overflow-y-auto p-2 space-y-1"></div>
        </div>
      </div>

      <!-- DRAWER DE NOTIFICACIONES SOMÁTICAS (CTRL + SHIFT + N) -->
      <div id="ss-drawer-notifs" class="fixed inset-0 z-[65] hidden justify-end bg-black/65 backdrop-blur-sm" onclick="window.SomaticShell.cerrarTodo()">
        <div class="w-full max-w-md h-full bg-[#0c0c0f] border-l border-white/[0.1] p-5 flex flex-col gap-4 overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold tracking-widest text-[#83da85] uppercase">CERO URGENCIA • HOMEOSTASIS</span>
              <h3 class="text-lg font-extrabold text-white">Notificaciones Somáticas</h3>
            </div>
            <button type="button" onclick="window.SomaticShell.cerrarTodo()" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-[#18181d] border border-white/[0.06]">
            <div>
              <p class="text-[13px] font-bold text-white">Modo Foco Profundo Somático</p>
              <p class="text-[11px] text-[#8e8e93]">Pausa avisos no biológicos</p>
            </div>
            <input id="ss-toggle-foco-drawer" type="checkbox" class="w-4 h-4 accent-[#83da85]" onchange="window.SomaticShell._toggleFocoDrawer(this.checked)" />
          </div>

          <div id="ss-notif-filtros" class="flex flex-wrap gap-1.5"></div>
          <div id="ss-notif-body" class="flex-1 space-y-2.5"></div>

          <div class="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <button type="button" onclick="window.SomaticShell.abrirPreferencias()" class="text-[#ffb961] hover:underline font-semibold">Preferencias somáticas</button>
            <button type="button" onclick="window.SomaticShell._limpiarNotifs()" class="text-[#8e8e93] hover:text-white">Marcar todo en calma</button>
          </div>
        </div>
      </div>

      <!-- MODAL PREFERENCIAS SOMÁTICAS -->
      <div id="ss-modal-prefs" class="fixed inset-0 z-[65] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto" onclick="window.SomaticShell.cerrarTodo()">
        <div class="w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.12] p-6 my-8 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold tracking-widest text-[#ffb961] uppercase">GUARDIÁN DEL SISTEMA NERVIOSO</span>
              <h3 class="text-lg font-extrabold text-white">Preferencias de Alertas Somáticas</h3>
            </div>
            <button type="button" onclick="window.SomaticShell.cerrarTodo()" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div id="ss-prefs-list" class="space-y-2.5 max-h-80 overflow-y-auto pr-1"></div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="window.SomaticShell.cerrarTodo()" class="px-4 py-2 rounded-xl bg-[#83da85] text-[#08080a] text-xs font-bold">Listo (Esc)</button>
          </div>
        </div>
      </div>

      <!-- MODAL ATAJOS & MODO FOCUS -->
      <div id="ss-modal-atajos" class="fixed inset-0 z-[65] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto" onclick="window.SomaticShell.cerrarTodo()">
        <div class="w-full max-w-md rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-extrabold text-white">Atajos &amp; Modo Focus</h3>
            <button type="button" onclick="window.SomaticShell.cerrarTodo()" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div class="space-y-2 text-[13px]">
            <div class="flex justify-between p-2.5 rounded-lg bg-[#18181d]"><span class="text-[#a1a1aa]">Command Palette Spotlight</span><kbd class="px-2 py-0.5 rounded bg-white/10 text-white text-xs">Ctrl + K</kbd></div>
            <div class="flex justify-between p-2.5 rounded-lg bg-[#18181d]"><span class="text-[#a1a1aa]">Notificaciones Somáticas</span><kbd class="px-2 py-0.5 rounded bg-white/10 text-white text-xs">Ctrl + Shift + N</kbd></div>
            <div class="flex justify-between p-2.5 rounded-lg bg-[#18181d]"><span class="text-[#a1a1aa]">Atajos &amp; Focus</span><kbd class="px-2 py-0.5 rounded bg-white/10 text-white text-xs">Ctrl + /</kbd></div>
            <div class="flex justify-between p-2.5 rounded-lg bg-[#18181d]"><span class="text-[#a1a1aa]">Guardar modal activo</span><kbd class="px-2 py-0.5 rounded bg-white/10 text-white text-xs">Ctrl + ↵</kbd></div>
            <div class="flex justify-between p-2.5 rounded-lg bg-[#18181d]"><span class="text-[#a1a1aa]">Cerrar capa activa</span><kbd class="px-2 py-0.5 rounded bg-white/10 text-white text-xs">Esc</kbd></div>
          </div>
          <div class="space-y-2 pt-2 border-t border-white/[0.08]">
            <p class="text-[11px] font-bold text-[#a855f7] uppercase tracking-wider">Preset de Ritmo Actual</p>
            <div class="grid grid-cols-3 gap-2" id="ss-focus-presets"></div>
          </div>
        </div>
      </div>

      <!-- MODAL EXPORTAR -->
      <div id="ss-modal-exportar" class="fixed inset-0 z-[65] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4" onclick="window.SomaticShell.cerrarTodo()">
        <div class="w-full max-w-md rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-extrabold text-white">Centro de Exportación</h3>
            <button type="button" onclick="window.SomaticShell.cerrarTodo()" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <p class="text-[13px] text-[#a1a1aa]">Generá un resumen limpio de esta vista en Markdown o imprimí en PDF A4 sin exponer tokens locales.</p>
          <div class="flex gap-2.5">
            <button type="button" onclick="window.SomaticShell._copiarMarkdown()" class="flex-1 py-2.5 px-3 rounded-xl bg-[#1c1c1f] hover:bg-[#232326] text-white text-xs font-bold">Copiar Markdown</button>
            <button type="button" onclick="window.print()" class="flex-1 py-2.5 px-3 rounded-xl bg-[#38bdf8] text-[#08080a] text-xs font-bold">Imprimir / PDF (Ctrl+P)</button>
          </div>
          <p id="ss-export-msg" class="text-[12px] text-[#83da85] hidden"></p>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  let _notifFiltro = "Todas";
  let _boxTimer = null;
  let _boxSegundos = 60;

  const SomaticShell = {
    cerrarTodo() {
      ["ss-modal-spotlight", "ss-drawer-notifs", "ss-modal-prefs", "ss-modal-atajos", "ss-modal-exportar"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.classList.add("hidden"); el.classList.remove("flex"); }
      });
      if (_boxTimer) { clearInterval(_boxTimer); _boxTimer = null; }
    },
    abrirSpotlight() {
      _injectShell();
      this.cerrarTodo();
      const m = document.getElementById("ss-modal-spotlight");
      m.classList.remove("hidden"); m.classList.add("flex");
      const inp = document.getElementById("ss-spotlight-input");
      inp.value = "";
      this._filtrarSpotlight();
      setTimeout(() => inp.focus(), 30);
    },
    _filtrarSpotlight() {
      const q = (document.getElementById("ss-spotlight-input").value || "").trim().toLowerCase();
      const acciones = [
        { titulo: "Notificaciones Somáticas (Ctrl+Shift+N)", desc: "Abrir feed calmo o Mini Pausa 60s", icon: "notifications_active", fn: "window.SomaticShell.abrirNotificaciones()" },
        { titulo: "Preferencias de Alertas Somáticas", desc: "Cero Culpa, Blindaje Nocturno, Protección Lútea", icon: "tune", fn: "window.SomaticShell.abrirPreferencias()" },
        { titulo: "Atajos de Teclado & Modo Focus", desc: "Cheat sheet y presets de energía", icon: "keyboard", fn: "window.SomaticShell.abrirAtajos()" },
        { titulo: "Centro de Exportación", desc: "Copiar Markdown o imprimir PDF A4", icon: "ios_share", fn: "window.SomaticShell.abrirExportar()" },
      ];
      const mods = MODULOS_NAVEGACION.filter((m) => !q || m.titulo.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));
      const acts = acciones.filter((a) => !q || a.titulo.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
      const cont = document.getElementById("ss-spotlight-list");
      const htmlMods = mods.map((m) => `
        <a href="${_esc(m.href)}" ${m.externo ? 'target="_blank" rel="noopener"' : ""} class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all">
          <span class="material-symbols-outlined text-[18px] text-[#ff5f52]">${_esc(m.icon)}</span>
          <div class="min-w-0">
            <p class="text-[13px] font-bold text-white">${_esc(m.titulo)}</p>
            <p class="text-[11px] text-[#8e8e93] truncate">${_esc(m.desc)}</p>
          </div>
        </a>`).join("");
      const htmlActs = acts.map((a) => `
        <button type="button" onclick="${a.fn}" class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all">
          <span class="material-symbols-outlined text-[18px] text-[#83da85]">${_esc(a.icon)}</span>
          <div class="min-w-0">
            <p class="text-[13px] font-bold text-white">${_esc(a.titulo)}</p>
            <p class="text-[11px] text-[#8e8e93] truncate">${_esc(a.desc)}</p>
          </div>
        </button>`).join("");
      cont.innerHTML = htmlMods + htmlActs || `<p class="text-center text-xs text-[#8e8e93] py-6">Sin coincidencias para "${_esc(q)}"</p>`;
    },
    abrirNotificaciones() {
      _injectShell();
      this.cerrarTodo();
      const d = document.getElementById("ss-drawer-notifs");
      d.classList.remove("hidden"); d.classList.add("flex");
      document.getElementById("ss-toggle-foco-drawer").checked = Boolean(leerPrefs().focoProfundo);
      this._renderNotifs();
    },
    _toggleFocoDrawer(activo) {
      const p = leerPrefs();
      p.focoProfundo = Boolean(activo);
      guardarPrefs(p);
      this._renderNotifs();
    },
    _setFiltroNotif(cat) {
      _notifFiltro = cat;
      this._renderNotifs();
    },
    _descartarNotif(id) {
      const lista = leerNotifs().filter((n) => n.id !== id);
      guardarNotifs(lista);
      this._renderNotifs();
    },
    _limpiarNotifs() {
      guardarNotifs([]);
      this._renderNotifs();
    },
    _renderNotifs() {
      const prefs = leerPrefs();
      const todas = leerNotifs().filter((n) => !prefs.focoProfundo || n.cat === "Biológicas");
      const cats = ["Todas", "Biológicas", "Notion Sync", "Hábitos"];
      document.getElementById("ss-notif-filtros").innerHTML = cats.map((c) => {
        const cnt = c === "Todas" ? todas.length : todas.filter((n) => n.cat === c).length;
        const act = _notifFiltro === c;
        return `<button type="button" onclick="window.SomaticShell._setFiltroNotif('${c}')" class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${act ? "bg-[#83da85]/20 text-[#83da85] border border-[#83da85]/40" : "bg-[#18181d] text-[#a1a1aa] border border-white/[0.06]"}">${c} (${cnt})</button>`;
      }).join("");

      const filtradas = _notifFiltro === "Todas" ? todas : todas.filter((n) => n.cat === _notifFiltro);
      const body = document.getElementById("ss-notif-body");
      if (filtradas.length === 0) {
        body.innerHTML = `
          <div class="rounded-2xl p-5 bg-[#18181d] border border-[#83da85]/25 text-center space-y-4">
            <span class="inline-flex px-3 py-1 rounded-full bg-[#83da85]/15 text-[#83da85] text-[10px] font-bold tracking-wider">FEED AL DÍA • 0 PENDIENTES • HOMEOSTASIS ACTIVA</span>
            <h4 class="text-base font-extrabold text-white">Tu espacio mental está despejado</h4>
            <p class="text-xs text-[#a1a1aa]">Todo está en calma. Si querés, regalate una Mini Pausa de 60 segundos.</p>
            <div class="p-4 rounded-xl bg-[#111115] border border-white/[0.06] space-y-2.5">
              <p class="text-[11px] font-bold text-[#83da85] uppercase tracking-wider">Box Breathing · Inhala 4s · Retiene 4s · Exhala 4s</p>
              <p id="ss-box-timer" class="text-2xl font-extrabold text-white">00:${String(_boxSegundos).padStart(2, "0")}</p>
              <button type="button" onclick="window.SomaticShell._iniciarBoxBreathing()" class="px-4 py-2 rounded-xl bg-[#83da85]/20 hover:bg-[#83da85]/30 text-[#83da85] text-xs font-bold">Iniciar Mini Pausa 60s</button>
            </div>
          </div>`;
        return;
      }
      body.innerHTML = filtradas.map((n) => `
        <div class="rounded-xl p-3.5 bg-[#18181d] border border-white/[0.06] flex items-start justify-between gap-3">
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-[#ffb961] uppercase tracking-wider">${_esc(n.cat)} · ${_esc(n.hora)}</span>
            <p class="text-[13px] font-bold text-white">${_esc(n.titulo)}</p>
            <p class="text-[12px] text-[#a1a1aa]">${_esc(n.detalle)}</p>
          </div>
          <button type="button" onclick="window.SomaticShell._descartarNotif('${_esc(n.id)}')" class="p-1 text-[#8e8e93] hover:text-[#83da85]" title="Resolver">
            <span class="material-symbols-outlined text-[18px]">check_circle</span>
          </button>
        </div>`).join("");
    },
    _iniciarBoxBreathing() {
      if (_boxTimer) clearInterval(_boxTimer);
      _boxSegundos = 60;
      const el = document.getElementById("ss-box-timer");
      if (el) el.textContent = "01:00";
      _boxTimer = setInterval(() => {
        _boxSegundos -= 1;
        const t = document.getElementById("ss-box-timer");
        if (!t) { clearInterval(_boxTimer); _boxTimer = null; return; }
        if (_boxSegundos <= 0) {
          clearInterval(_boxTimer); _boxTimer = null; _boxSegundos = 60;
          t.textContent = "✓ Calma";
          return;
        }
        t.textContent = `00:${String(_boxSegundos).padStart(2, "0")}`;
      }, 1000);
    },
    abrirPreferencias() {
      _injectShell();
      this.cerrarTodo();
      const m = document.getElementById("ss-modal-prefs");
      m.classList.remove("hidden"); m.classList.add("flex");
      const prefs = leerPrefs();
      const items = [
        ["transicionHormonal", "Transición Hormonal (Ciclo Femenino)", "Aviso suave 48h antes de fase lútea"],
        ["sobrecargaVFC", "Detector de Sobrecarga Simpática", "Sugiere pausa S.T.O.P. ante carga alta"],
        ["hidratacion", "Hidratación & Enraizamiento", "Recordatorios gentiles de agua y pausa"],
        ["tensionCervical", "Tensión Cervical & Postura", "Sugerencia de estiramiento cada 90 min"],
        ["loteCompasivo", "Lote Compasivo (Batching Calmado)", "Agrupa avisos en 09:30 • 14:00 • 19:30"],
        ["ceroCulpa", "Modo Cero Culpa", "Oculta contadores rojos punitivos de atraso"],
        ["blindajeNocturno", "Blindaje Nocturno (22:00–08:00)", "Silencio total nocturno"],
        ["proteccionLutea", "Protección Fase Lútea", "Prioriza máximo 3 focos si energía < 60%"],
      ];
      document.getElementById("ss-prefs-list").innerHTML = items.map(([key, tit, desc]) => `
        <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#18181d] border border-white/[0.06] cursor-pointer">
          <div>
            <p class="text-[13px] font-bold text-white">${tit}</p>
            <p class="text-[11px] text-[#8e8e93]">${desc}</p>
          </div>
          <input type="checkbox" ${prefs[key] ? "checked" : ""} onchange="window.SomaticShell._setPref('${key}', this.checked)" class="w-4 h-4 accent-[#83da85]" />
        </label>`).join("");
    },
    _setPref(key, val) {
      const p = leerPrefs();
      p[key] = Boolean(val);
      guardarPrefs(p);
    },
    abrirAtajos() {
      _injectShell();
      this.cerrarTodo();
      const m = document.getElementById("ss-modal-atajos");
      m.classList.remove("hidden"); m.classList.add("flex");
      let actual = "Equilibrado";
      try { actual = localStorage.getItem(FOCUS_KEY) || "Equilibrado"; } catch (e) {}
      document.getElementById("ss-focus-presets").innerHTML = ["Equilibrado", "Foco Profundo", "Recuperación"].map((p) => `
        <button type="button" onclick="window.SomaticShell._setFocusPreset('${p}')" class="py-2 px-2 rounded-xl text-xs font-bold border transition-all ${p === actual ? "bg-[#a855f7]/25 border-[#a855f7] text-white" : "bg-[#18181d] border-white/[0.06] text-[#a1a1aa]"}">${p}</button>`).join("");
    },
    _setFocusPreset(preset) {
      try { localStorage.setItem(FOCUS_KEY, preset); } catch (e) {}
      this.abrirAtajos();
    },
    abrirExportar() {
      _injectShell();
      this.cerrarTodo();
      const m = document.getElementById("ss-modal-exportar");
      m.classList.remove("hidden"); m.classList.add("flex");
      const msg = document.getElementById("ss-export-msg");
      if (msg) msg.classList.add("hidden");
    },
    _copiarMarkdown() {
      const titulo = document.title || "AsistenteSabry";
      const h1 = (document.querySelector("h1") || {}).innerText || titulo;
      const md = `# ${h1}\n\n- Exportado: ${new Date().toLocaleString("es-AR")}\n- URL: ${location.pathname}\n`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).catch(() => {});
      }
      const msg = document.getElementById("ss-export-msg");
      if (msg) {
        msg.textContent = "✓ Resumen Markdown copiado al portapapeles.";
        msg.classList.remove("hidden");
      }
    },
  };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      _injectShell();
      const syncOnline = () => {
        const b = document.getElementById("ss-offline-banner");
        if (b) b.classList.toggle("hidden", navigator.onLine !== false);
      };
      syncOnline();
      window.addEventListener("online", syncOnline);
      window.addEventListener("offline", syncOnline);
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        SomaticShell.abrirSpotlight();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        SomaticShell.abrirNotificaciones();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        SomaticShell.abrirAtajos();
      } else if (e.key === "Escape") {
        SomaticShell.cerrarTodo();
      }
    });
  }

  global.SomaticShell = SomaticShell;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { MODULOS_NAVEGACION, PREFS_DEFAULT, NOTIFS_DEFAULT, SomaticShell };
  }
})(typeof window !== "undefined" ? window : globalThis);
