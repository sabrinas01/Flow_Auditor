/**
 * Escáner OCR (foto / imagen / Ctrl+V) para extraer texto y enviarlo a Notion
 * eligiendo previamente el tipo: Frase, Libro o Afirmación.
 */

function construirSolicitudOcrNotion(tipo, texto, extras = {}) {
  const limpio = (texto || "").trim();
  if (!limpio) {
    return { ok: false, error: "El texto extraído no puede estar vacío." };
  }
  const t = (tipo || "").trim().toLowerCase();
  if (t === "frase") {
    return {
      ok: true,
      accion: "crear_frase_relacion",
      datos: {
        frase: limpio,
        autor: (extras.autor || "").trim() || null,
      },
    };
  }
  if (t === "libro") {
    const titulo = (extras.titulo || "").trim() || "Cita escaneada";
    return {
      ok: true,
      accion: "guardar_cita_libro_ocio",
      datos: {
        titulo,
        autor: (extras.autor || "").trim() || null,
        texto: limpio,
      },
    };
  }
  if (t === "afirmacion" || t === "afirmaciones") {
    return {
      ok: true,
      accion: "crear_afirmacion_relacion",
      datos: {
        nombre: limpio,
        categoria: (extras.categoria || "").trim() || null,
        contexto: (extras.contexto || "").trim() || null,
        integrada: false,
      },
    };
  }
  return { ok: false, error: "Elegí qué tipo de texto es (Frase, Libro o Afirmación)." };
}

function _cargarScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

async function abrirEscanerOCR() {
  if (typeof document === "undefined") return;
  let modal = document.getElementById("modal-ocr-scanner");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-ocr-scanner";
    modal.className = "fixed inset-0 z-[85] hidden items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.12] p-6 space-y-4 my-8 shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-label-caps text-[#ff5f52] tracking-widest">CAPTURA RÁPIDA · OCR</p>
            <h3 class="text-lg font-bold text-white">Escanear foto o texto para Notion</h3>
          </div>
          <button type="button" id="ocr-btn-cerrar" class="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <label class="flex-1 cursor-pointer bg-[#ff5f52] hover:bg-[#ff5f52]/90 text-white font-bold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>Sacar foto o subir imagen</span>
            <input id="ocr-file-input" type="file" accept="image/*" capture="environment" class="hidden" />
          </label>
        </div>
        <p class="text-[11px] text-[#8e8e93] text-center">También podés pegar una captura con <kbd class="px-1.5 py-0.5 rounded bg-white/[0.06] text-white">Ctrl + V</kbd>.</p>

        <div id="ocr-preview-wrap" class="hidden rounded-xl overflow-hidden border border-white/[0.08] bg-[#08080a] max-h-40 flex items-center justify-center">
          <img id="ocr-preview-img" alt="Vista previa" class="max-h-40 object-contain" />
        </div>

        <div id="ocr-progress-wrap" class="hidden space-y-1">
          <p id="ocr-progress-lbl" class="text-xs text-[#ffb961] font-semibold">Leyendo texto de la imagen...</p>
          <div class="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div id="ocr-progress-bar" class="h-full bg-[#ffb961] transition-all" style="width: 10%"></div>
          </div>
        </div>

        <div>
          <label for="ocr-texto" class="block text-[12px] font-semibold text-[#8e8e93] mb-1">Texto extraído (editable)</label>
          <textarea id="ocr-texto" rows="4" placeholder="El texto reconocido aparecerá acá (o podés escribir/pegar directo)..." class="w-full bg-[#1c1c1f] border border-[#232326] rounded-xl px-3 py-2.5 text-white text-[13px] focus:outline-none focus:border-[#ff5f52]"></textarea>
        </div>

        <div class="space-y-2">
          <p class="text-[12px] font-semibold text-white">¿Qué tipo de texto es? <span class="text-[#ff5f52]">*</span></p>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" data-ocr-tipo="frase" class="ocr-tipo-btn py-2 px-2 rounded-xl border border-white/[0.1] bg-[#18181d] text-xs font-bold text-[#e5e2e1] hover:border-[#ffb961]">💬 Frase</button>
            <button type="button" data-ocr-tipo="libro" class="ocr-tipo-btn py-2 px-2 rounded-xl border border-white/[0.1] bg-[#18181d] text-xs font-bold text-[#e5e2e1] hover:border-[#00aaff]">📚 Libro</button>
            <button type="button" data-ocr-tipo="afirmacion" class="ocr-tipo-btn py-2 px-2 rounded-xl border border-white/[0.1] bg-[#18181d] text-xs font-bold text-[#e5e2e1] hover:border-[#83da85]">🛡️ Afirmación</button>
          </div>
        </div>

        <div id="ocr-extras-frase" class="hidden space-y-2">
          <input id="ocr-frase-autor" type="text" placeholder="Autor (opcional)" class="w-full bg-[#1c1c1f] border border-[#232326] rounded-lg px-3 py-2 text-white text-[13px]" />
        </div>
        <div id="ocr-extras-libro" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input id="ocr-libro-titulo" type="text" placeholder="Título del libro *" class="w-full bg-[#1c1c1f] border border-[#232326] rounded-lg px-3 py-2 text-white text-[13px]" />
          <input id="ocr-libro-autor" type="text" placeholder="Autor (opcional)" class="w-full bg-[#1c1c1f] border border-[#232326] rounded-lg px-3 py-2 text-white text-[13px]" />
        </div>
        <div id="ocr-extras-afirmacion" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input id="ocr-afir-cat" type="text" placeholder="Categoría (ej. 🛡️ Autorrespeto)" class="w-full bg-[#1c1c1f] border border-[#232326] rounded-lg px-3 py-2 text-white text-[13px]" />
          <input id="ocr-afir-ctx" type="text" placeholder="Contexto (opcional)" class="w-full bg-[#1c1c1f] border border-[#232326] rounded-lg px-3 py-2 text-white text-[13px]" />
        </div>

        <p id="ocr-status-msg" class="text-[12px] hidden"></p>

        <div class="flex gap-2.5 pt-1">
          <button type="button" id="ocr-btn-cancelar" class="flex-1 bg-[#1c1c1f] hover:bg-[#232326] text-white font-semibold text-[13px] py-2.5 rounded-xl">Cancelar</button>
          <button type="button" id="ocr-btn-guardar" class="flex-1 bg-[#53a759] hover:bg-[#53a759]/90 text-white font-bold text-[13px] py-2.5 rounded-xl">Guardar en Notion</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let tipoSeleccionado = "";
    const cerrar = () => { modal.classList.add("hidden"); modal.classList.remove("flex"); };
    modal.addEventListener("click", cerrar);
    document.getElementById("ocr-btn-cerrar").addEventListener("click", cerrar);
    document.getElementById("ocr-btn-cancelar").addEventListener("click", cerrar);

    const seleccionarTipo = (tipo) => {
      tipoSeleccionado = tipo;
      modal.querySelectorAll(".ocr-tipo-btn").forEach((b) => {
        const activo = b.dataset.ocrTipo === tipo;
        b.classList.toggle("border-[#ff5f52]", activo);
        b.classList.toggle("bg-[#ff5f52]/15", activo);
        b.classList.toggle("text-white", activo);
      });
      document.getElementById("ocr-extras-frase").classList.toggle("hidden", tipo !== "frase");
      document.getElementById("ocr-extras-libro").classList.toggle("hidden", tipo !== "libro");
      document.getElementById("ocr-extras-afirmacion").classList.toggle("hidden", tipo !== "afirmacion");
    };
    modal.querySelectorAll(".ocr-tipo-btn").forEach((b) => {
      b.addEventListener("click", () => seleccionarTipo(b.dataset.ocrTipo));
    });

    const procesarImagen = async (fileOrBlob) => {
      if (!fileOrBlob) return;
      const urlObj = URL.createObjectURL(fileOrBlob);
      document.getElementById("ocr-preview-img").src = urlObj;
      document.getElementById("ocr-preview-wrap").classList.remove("hidden");
      const progWrap = document.getElementById("ocr-progress-wrap");
      const progBar = document.getElementById("ocr-progress-bar");
      const progLbl = document.getElementById("ocr-progress-lbl");
      progWrap.classList.remove("hidden");
      progBar.style.width = "15%";
      progLbl.textContent = "Cargando motor OCR...";

      try {
        if (!window.Tesseract) {
          await _cargarScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
        }
        progLbl.textContent = "Reconociendo texto...";
        const res = await window.Tesseract.recognize(fileOrBlob, "spa+eng", {
          logger: (m) => {
            if (m.status === "recognizing text" && typeof m.progress === "number") {
              progBar.style.width = `${Math.max(15, Math.round(m.progress * 100))}%`;
            }
          },
        });
        const textoLimpio = (res.data && res.data.text ? res.data.text : "").trim();
        document.getElementById("ocr-texto").value = textoLimpio;
        progWrap.classList.add("hidden");
        if (typeof mostrarToast === "function") mostrarToast("Texto extraído de la imagen", "success");
      } catch (err) {
        progWrap.classList.add("hidden");
        const msg = document.getElementById("ocr-status-msg");
        msg.textContent = "No se pudo leer la imagen. Podés escribir o pegar el texto manualmente.";
        msg.className = "text-[12px] text-[#ff5f52]";
      }
    };

    document.getElementById("ocr-file-input").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) procesarImagen(f);
    });

    modal.addEventListener("paste", (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) { procesarImagen(blob); break; }
        }
      }
    });

    document.getElementById("ocr-btn-guardar").addEventListener("click", async () => {
      const msg = document.getElementById("ocr-status-msg");
      const sol = construirSolicitudOcrNotion(tipoSeleccionado, document.getElementById("ocr-texto").value, {
        autor: tipoSeleccionado === "libro" ? document.getElementById("ocr-libro-autor").value : document.getElementById("ocr-frase-autor").value,
        titulo: document.getElementById("ocr-libro-titulo").value,
        categoria: document.getElementById("ocr-afir-cat").value,
        contexto: document.getElementById("ocr-afir-ctx").value,
      });
      if (!sol.ok) {
        msg.textContent = sol.error;
        msg.className = "text-[12px] text-[#ff5f52]";
        return;
      }
      let token = "";
      try { token = localStorage.getItem("asistente_sabry:github_pat") || ""; } catch (e) {}
      if (!token) {
        msg.textContent = "Configurá primero tu token de GitHub en cualquiera de los módulos de escritura.";
        msg.className = "text-[12px] text-[#ffb961]";
        return;
      }
      if (typeof construirSolicitudNotionWrite !== "function") {
        await _cargarScript("./src/utils/notion_write.js");
      }
      msg.textContent = "Enviando a Notion vía GitHub Actions...";
      msg.className = "text-[12px] text-[#ffb961]";
      try {
        const dispatchedAfterMs = Date.now();
        const { url, options } = construirSolicitudNotionWrite("sabrinas01", "Flow_Auditor", sol.accion, sol.datos, token);
        const r = await fetch(url, options);
        if (r.status !== 204) {
          msg.textContent = `Error al enviar (${r.status}).`;
          msg.className = "text-[12px] text-[#ff5f52]";
          return;
        }
        const conf = await esperarConfirmacionWorkflow({
          owner: "sabrinas01", repo: "Flow_Auditor", token,
          workflowFile: WORKFLOW_NOTION_WRITE, dispatchedAfterMs,
        });
        if (conf.ok) {
          if (typeof mostrarToast === "function") mostrarToast("¡Guardado en Notion!", "success");
          cerrar();
        } else {
          msg.textContent = conf.error || "No se pudo confirmar.";
          msg.className = "text-[12px] text-[#ff5f52]";
        }
      } catch (e) {
        msg.textContent = "Error de conexión con GitHub.";
        msg.className = "text-[12px] text-[#ff5f52]";
      }
    });
  }
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { construirSolicitudOcrNotion, abrirEscanerOCR };
}
