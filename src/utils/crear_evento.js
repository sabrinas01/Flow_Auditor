/**
 * Lógica pura (sin DOM, sin red) del formulario "Crear tarea" de
 * agenda-personal.html: valida los campos y construye tanto el payload de
 * evento (mismo esquema de propiedades que la BD de Notion "Eventos y
 * Recordatorios únicos") como la solicitud HTTP de `repository_dispatch` que
 * GitHub Actions usa para crearlo (ver .github/workflows/crear_evento_agenda.yml
 * y crear_evento_agenda() en extract_and_audit.py). Separada de
 * agenda-personal.html para poder testearla con Jest sin necesitar un DOM real
 * (mismo criterio que dashboard_logic.js).
 */

const EVENT_TYPE_DISPATCH = "crear_evento_agenda";

/**
 * Combina una fecha (YYYY-MM-DD) y una hora opcional (HH:MM) en el formato
 * que espera la propiedad `Fecha` de Notion: con hora, ISO-8601 con offset
 * explícito GMT-3 (mismo huso que usa evaluar_bloque_temporal() en
 * extract_and_audit.py); sin hora, la fecha sola (evento de todo el día).
 */
function combinarFechaHora(fecha, hora) {
  if (!hora) return fecha;
  return `${fecha}T${hora}:00-03:00`;
}

/**
 * Valida y normaliza los datos crudos del formulario. Devuelve
 * { ok: true, payload } o { ok: false, error } — nunca lanza.
 */
function construirPayloadEvento(datosFormulario) {
  const nombre = (datosFormulario.nombre || "").trim();
  const fecha = (datosFormulario.fecha || "").trim();
  const horaInicio = (datosFormulario.horaInicio || "").trim();
  const horaFin = (datosFormulario.horaFin || "").trim();

  if (!nombre) {
    return { ok: false, error: "El nombre de la tarea es obligatorio." };
  }
  if (!fecha) {
    return { ok: false, error: "La fecha es obligatoria." };
  }
  if (horaFin && !horaInicio) {
    return { ok: false, error: "Si cargás hora de fin, cargá también hora de inicio." };
  }

  const payload = {
    nombre,
    fecha_inicio: combinarFechaHora(fecha, horaInicio),
    fecha_fin: horaFin ? combinarFechaHora(fecha, horaFin) : null,
    estado: (datosFormulario.estado || "").trim() || "Sin empezar",
    tipo_tarea: (datosFormulario.tipoTarea || "").trim() || null,
    prioridad: (datosFormulario.prioridad || "").trim() || null,
    descripcion: (datosFormulario.descripcion || "").trim() || null,
  };

  return { ok: true, payload };
}

/**
 * Construye la solicitud HTTP (url/método/headers/body) hacia el endpoint de
 * `repository_dispatch` de la API de GitHub — pura, no ejecuta el fetch, para
 * poder testear la forma del request sin red real.
 */
function construirSolicitudDispatch(owner, repo, payloadEvento, token) {
  return {
    url: `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE_DISPATCH,
        client_payload: payloadEvento,
      }),
    },
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EVENT_TYPE_DISPATCH,
    combinarFechaHora,
    construirPayloadEvento,
    construirSolicitudDispatch,
  };
}
