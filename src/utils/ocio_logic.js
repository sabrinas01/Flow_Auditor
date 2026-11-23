/**
 * Lógica pura (sin DOM, sin red) del módulo Ocio (ocio.html):
 * - Datos semilla iniciales (mientras se conecta Notion Hub).
 * - Cálculo de KPIs (libros leídos, series en curso, películas vistas, horas).
 * - Filtrado, construcción de ítems ABM y movimiento de tarjetas Kanban.
 */

const OCIO_STORAGE_KEY = "asistente_sabry:ocio:v1";

const OCIO_KANBAN_COLUMNAS = [
  { key: "ideas", label: "💡 Ideas / Por Descubrir", dotClass: "bg-[#8e8e93]" },
  { key: "finde", label: "🗓️ Para el Finde", dotClass: "bg-[#ffb961]" },
  { key: "curso", label: "⚡ En curso / Disfrutando", dotClass: "bg-[#83da85]" },
  { key: "completado", label: "✨ Completado / Visto", dotClass: "bg-[#83da85]" },
];

const OCIO_SEED = {
  libros: [
    { id: "lib-1", titulo: "Hábitos Atómicos", secundario: "James Clear", genero: "Crecimiento", estado: "En curso / Viendo", progreso: "68%", detalle: "Pág 218 / 320", puntuacion: 4.9, notas: "Sistema práctico de micro-hábitos." },
    { id: "lib-2", titulo: "El Poder del Ahora", secundario: "Eckhart Tolle", genero: "Mindfulness", estado: "En curso / Viendo", progreso: "45%", detalle: "Pág 102 / 225", puntuacion: 4.8, notas: "Lectura en el parque los fines de semana." },
    { id: "lib-3", titulo: "Clean Architecture", secundario: "Robert C. Martin", genero: "Tecnología", estado: "Completado / Vista", progreso: "100%", detalle: "432 / 432 págs", puntuacion: 4.7, notas: "Principios de desacoplamiento." },
    { id: "lib-4", titulo: "Mujeres que Corren con Lobos", secundario: "Clarissa Pinkola Estés", genero: "Psicología", estado: "Por empezar / En lista", progreso: "0%", detalle: "En lista", puntuacion: 5.0, notas: "Pendiente para vacaciones." },
  ],
  series: [
    { id: "ser-1", titulo: "The Bear (T3)", secundario: "Disney+", genero: "Drama", estado: "En curso / Viendo", progreso: "60%", detalle: "Cap. 6 / 10", puntuacion: 4.9, notas: "Ritmo frenético y fotografía espectacular." },
    { id: "ser-2", titulo: "Severance (T2)", secundario: "Apple TV+", genero: "Sci-Fi", estado: "En curso / Viendo", progreso: "40%", detalle: "Cap. 4 / 10", puntuacion: 5.0, notas: "Misterio corporativo atrapante." },
    { id: "ser-3", titulo: "Shrinking", secundario: "Apple TV+", genero: "Comedia", estado: "En curso / Viendo", progreso: "80%", detalle: "Cap. 8 / 10", puntuacion: 4.8, notas: "Muy cálida y divertida." },
    { id: "ser-4", titulo: "Dark", secundario: "Netflix", genero: "Sci-Fi", estado: "Completado / Vista", progreso: "100%", detalle: "26 / 26 eps", puntuacion: 5.0, notas: "Obra maestra." },
  ],
  peliculas: [
    { id: "pel-1", titulo: "Dune: Parte 2", secundario: "Denis Villeneuve", genero: "Sci-Fi · 2h 46m", estado: "Completado / Vista", progreso: "100%", detalle: "Cine IMAX", puntuacion: 5.0, notas: "Experiencia sonora inolvidable." },
    { id: "pel-2", titulo: "Past Lives", secundario: "Celine Song", genero: "Drama · 1h 46m", estado: "Completado / Vista", progreso: "100%", detalle: "MUBI", puntuacion: 4.9, notas: "Delicada y emotiva." },
    { id: "pel-3", titulo: "Flow", secundario: "Gints Zilbalodis", genero: "Animación · 1h 25m", estado: "Por empezar / En lista", progreso: "0%", detalle: "Lista finde", puntuacion: 4.8, notas: "Para ver con mate." },
    { id: "pel-4", titulo: "Anatomía de una caída", secundario: "Justine Triet", genero: "Thriller · 2h 31m", estado: "Completado / Vista", progreso: "100%", detalle: "Prime Video", puntuacion: 4.7, notas: "Guion brillante." },
  ],
  kanban: [
    { id: "kan-1", col: "ideas", tag: "Cultura", titulo: "Noche de jazz en vivo", desc: "Revisar agenda de viernes en club local.", meta: "Salida nocturna" },
    { id: "kan-2", col: "finde", tag: "Arte", titulo: "Visitar muestra de arte contemporáneo", desc: "Entrada reservada para el museo Malba a las 16:00 hs.", meta: "Domingo 16:00" },
    { id: "kan-3", col: "finde", tag: "📚 Lectura", titulo: "Tarde de café y lectura en el parque", desc: "Llevar manta, mate y adelantar capítulos de Tolle.", meta: "Sábado 16h" },
    { id: "kan-4", col: "curso", tag: "📚 DB Libros", titulo: "Lectura matutina: Hábitos Atómicos", desc: "20 páginas con café matinal antes de encender pantallas.", meta: "68% leído" },
    { id: "kan-5", col: "curso", tag: "📺 DB Series", titulo: "The Bear - Temporada 3", desc: "Viendo Cap. 6. Ritmo frenético y fotografía espectacular.", meta: "6/10 eps" },
    { id: "kan-6", col: "completado", tag: "🎬 DB Películas", titulo: "Dune Parte 2 en cine IMAX", desc: "Experiencia sonora inolvidable y diseño de producción impecable.", meta: "★★★★★ 5/5" },
  ],
};

function calcularResumenOcio(datos) {
  const d = datos || {};
  const libros = Array.isArray(d.libros) ? d.libros : [];
  const series = Array.isArray(d.series) ? d.series : [];
  const peliculas = Array.isArray(d.peliculas) ? d.peliculas : [];

  const esDone = (e) => (e || "").toLowerCase().includes("completad") || (e || "").toLowerCase().includes("vista");
  const esCurso = (e) => (e || "").toLowerCase().includes("curso") || (e || "").toLowerCase().includes("leyendo") || (e || "").toLowerCase().includes("viendo");

  const librosLeidos = libros.filter((x) => esDone(x.estado)).length;
  const librosEnCurso = libros.filter((x) => esCurso(x.estado)).length;
  const seriesEnCurso = series.filter((x) => esCurso(x.estado)).length;
  const pelisVistas = peliculas.filter((x) => esDone(x.estado)).length;
  const pelisPendientes = peliculas.filter((x) => !esDone(x.estado)).length;

  const hLectura = Number((librosEnCurso * 2.1 + librosLeidos * 0.5).toFixed(1));
  const hSeries = Number((seriesEnCurso * 1.6).toFixed(1));
  const hPelis = Number((Math.min(pelisVistas, 3) * 0.8).toFixed(1));
  const totalHoras = Number((hLectura + hSeries + hPelis).toFixed(1));

  return {
    librosLeidos,
    librosEnCurso,
    seriesEnCurso,
    pelisVistas,
    pelisPendientes,
    hLectura,
    hSeries,
    hPelis,
    totalHoras,
  };
}

function filtrarCatalogoOcio(lista, query) {
  const arr = Array.isArray(lista) ? lista : [];
  const q = (query || "").trim().toLowerCase();
  if (!q) return arr;
  return arr.filter((item) =>
    `${item.titulo || ""} ${item.secundario || ""} ${item.genero || ""} ${item.estado || ""}`
      .toLowerCase()
      .includes(q)
  );
}

function construirItemOcio(datos) {
  const titulo = (datos.titulo || "").trim();
  const secundario = (datos.secundario || "").trim();
  if (!titulo) return { ok: false, error: "El título es obligatorio." };
  if (!secundario) return { ok: false, error: "El autor, plataforma o director es obligatorio." };

  const puntuacionRaw = Number(datos.puntuacion);
  const puntuacion = Number.isFinite(puntuacionRaw) ? Math.min(5, Math.max(1, puntuacionRaw)) : 5.0;

  return {
    ok: true,
    item: {
      id: (datos.id || "").trim() || `ocio-${Date.now()}`,
      titulo,
      secundario,
      genero: (datos.genero || "").trim() || "General",
      estado: (datos.estado || "").trim() || "En curso / Viendo",
      progreso: (datos.progreso || "").trim() || "0%",
      detalle: (datos.progreso || "").trim() || "En seguimiento",
      puntuacion,
      notas: (datos.notas || "").trim(),
    },
  };
}

function moverTarjetaKanban(kanban, id, direccion) {
  const cols = OCIO_KANBAN_COLUMNAS.map((c) => c.key);
  return (Array.isArray(kanban) ? kanban : []).map((card) => {
    if (card.id !== id) return card;
    const idx = cols.indexOf(card.col);
    const nextIdx = idx + direccion;
    if (idx < 0 || nextIdx < 0 || nextIdx >= cols.length) return card;
    return { ...card, col: cols[nextIdx] };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OCIO_STORAGE_KEY,
    OCIO_KANBAN_COLUMNAS,
    OCIO_SEED,
    calcularResumenOcio,
    filtrarCatalogoOcio,
    construirItemOcio,
    moverTarjetaKanban,
  };
}
