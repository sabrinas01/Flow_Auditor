/**
 * Lógica pura (sin DOM, sin red directa) para disparar acciones de escritura
 * hacia Notion vía GitHub Actions (`repository_dispatch` tipo `notion_write`)
 * y esperar la confirmación real de ejecución del workflow mediante polling.
 *
 * Reutilizable entre Agenda Personal (ABM), Recordatorios Varios,
 * Recordatorios Diarios y futuros módulos (ej. Finanzas).
 */

const EVENT_TYPE_NOTION_WRITE = "notion_write";
const WORKFLOW_NOTION_WRITE = "notion_write.yml";

function _detectarEntorno() {
  if (typeof window !== "undefined" && window.location && typeof window.location.pathname === "string") {
    return window.location.pathname.includes("/dev/") ? "develop" : "production";
  }
  return "production";
}

/**
 * Construye el request HTTP para disparar `repository_dispatch` con
 * `event_type: "notion_write"` y payload `{ accion, datos, env }`.
 */
function construirSolicitudNotionWrite(owner, repo, accion, datos, token) {
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
        event_type: EVENT_TYPE_NOTION_WRITE,
        client_payload: { accion, datos, env: _detectarEntorno() },
      }),
    },
  };
}

/**
 * Construye el request GET para consultar los últimos runs del workflow
 * disparados por `repository_dispatch`.
 */
function construirSolicitudEstadoRuns(owner, repo, workflowFile, token) {
  return {
    url: `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?event=repository_dispatch&per_page=5`,
    options: {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  };
}

/**
 * Busca en la lista de `workflow_runs` el run más reciente creado a partir
 * de `dispatchedAfterMs` (con 10s de tolerancia por desfase de reloj).
 */
function buscarRunDisparado(runs, dispatchedAfterMs) {
  if (!Array.isArray(runs) || runs.length === 0) return null;
  const umbral = dispatchedAfterMs - 10000;
  return runs.find((run) => {
    const creadoMs = Date.parse(run.created_at || "");
    return !Number.isNaN(creadoMs) && creadoMs >= umbral;
  }) || null;
}

/**
 * Espera haciendo polling hasta que el workflow disparado termine.
 * Inyecta `fetchFn` y `sleepFn` para testear sin red ni esperas reales.
 * Devuelve `{ ok: true, runId }` o `{ ok: false, error }`.
 */
async function esperarConfirmacionWorkflow({
  owner,
  repo,
  token,
  workflowFile = WORKFLOW_NOTION_WRITE,
  dispatchedAfterMs = Date.now(),
  fetchFn = fetch,
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  timeoutMs = 120000,
  intervalMs = 3000,
}) {
  const inicio = Date.now();
  const { url, options } = construirSolicitudEstadoRuns(owner, repo, workflowFile, token);

  while (Date.now() - inicio < timeoutMs) {
    await sleepFn(intervalMs);
    let resp;
    try {
      resp = await fetchFn(url, options);
    } catch (e) {
      continue;
    }
    if (!resp || !resp.ok) continue;

    const data = await resp.json();
    const run = buscarRunDisparado(data.workflow_runs, dispatchedAfterMs);
    if (!run) continue;

    if (run.status === "completed") {
      if (run.conclusion === "success") {
        return { ok: true, runId: run.id };
      }
      return {
        ok: false,
        error: `La actualización en Notion falló (${run.conclusion || "error"}). Revisá GitHub Actions.`,
      };
    }
  }

  return {
    ok: false,
    error: "La confirmación tardó más de lo esperado. Verificá en unos segundos recargando la página.",
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EVENT_TYPE_NOTION_WRITE,
    WORKFLOW_NOTION_WRITE,
    construirSolicitudNotionWrite,
    construirSolicitudEstadoRuns,
    buscarRunDisparado,
    esperarConfirmacionWorkflow,
  };
}
