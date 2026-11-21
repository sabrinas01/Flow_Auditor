/**
 * Tests de la lógica pura de escritura en Notion vía repository_dispatch y
 * polling de confirmación de GitHub Actions (src/utils/notion_write.js).
 */
const {
  EVENT_TYPE_NOTION_WRITE,
  WORKFLOW_NOTION_WRITE,
  construirSolicitudNotionWrite,
  construirSolicitudEstadoRuns,
  buscarRunDisparado,
  esperarConfirmacionWorkflow,
} = require('../../src/utils/notion_write.js');

describe('construirSolicitudNotionWrite', () => {
  test('arma el POST repository_dispatch con event_type notion_write', () => {
    const { url, options } = construirSolicitudNotionWrite(
      'sabrinas01',
      'Flow_Auditor',
      'actualizar_evento',
      { page_id: 'abc', nombre: 'Turno' },
      'TOKEN_123',
    );
    expect(url).toBe('https://api.github.com/repos/sabrinas01/Flow_Auditor/dispatches');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer TOKEN_123');
    expect(JSON.parse(options.body)).toEqual({
      event_type: EVENT_TYPE_NOTION_WRITE,
      client_payload: {
        accion: 'actualizar_evento',
        datos: { page_id: 'abc', nombre: 'Turno' },
        env: 'production',
      },
    });
  });
});

describe('construirSolicitudEstadoRuns', () => {
  test('arma el GET para consultar runs del workflow', () => {
    const { url, options } = construirSolicitudEstadoRuns(
      'sabrinas01',
      'Flow_Auditor',
      WORKFLOW_NOTION_WRITE,
      'TOKEN_123',
    );
    expect(url).toBe(
      'https://api.github.com/repos/sabrinas01/Flow_Auditor/actions/workflows/notion_write.yml/runs?event=repository_dispatch&per_page=5',
    );
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer TOKEN_123');
  });
});

describe('buscarRunDisparado', () => {
  test('devuelve el run creado dentro de la ventana de tolerancia', () => {
    const base = Date.parse('2026-11-21T13:00:00Z');
    const runs = [
      { id: 2, created_at: '2026-11-21T12:59:55Z' },
      { id: 1, created_at: '2026-11-21T12:50:00Z' },
    ];
    expect(buscarRunDisparado(runs, base).id).toBe(2);
  });

  test('devuelve null si todos los runs son anteriores a la ventana', () => {
    const base = Date.parse('2026-11-21T13:00:00Z');
    const runs = [{ id: 1, created_at: '2026-11-21T12:50:00Z' }];
    expect(buscarRunDisparado(runs, base)).toBeNull();
  });
});

describe('esperarConfirmacionWorkflow', () => {
  test('hace polling hasta que el run completa con success', async () => {
    const base = Date.now();
    const fetchFn = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ id: 99, created_at: new Date(base).toISOString(), status: 'in_progress' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow_runs: [{ id: 99, created_at: new Date(base).toISOString(), status: 'completed', conclusion: 'success' }],
        }),
      });

    const res = await esperarConfirmacionWorkflow({
      owner: 'sabrinas01',
      repo: 'Flow_Auditor',
      token: 'TOK',
      dispatchedAfterMs: base,
      fetchFn,
      sleepFn: async () => {},
      timeoutMs: 10000,
      intervalMs: 1,
    });

    expect(res).toEqual({ ok: true, runId: 99 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test('devuelve error si el run termina con failure', async () => {
    const base = Date.now();
    const fetchFn = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [{ id: 100, created_at: new Date(base).toISOString(), status: 'completed', conclusion: 'failure' }],
      }),
    });

    const res = await esperarConfirmacionWorkflow({
      owner: 'sabrinas01',
      repo: 'Flow_Auditor',
      token: 'TOK',
      dispatchedAfterMs: base,
      fetchFn,
      sleepFn: async () => {},
      timeoutMs: 10000,
      intervalMs: 1,
    });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/failure/i);
  });

  test('devuelve error por timeout si no completa a tiempo', async () => {
    const res = await esperarConfirmacionWorkflow({
      owner: 'sabrinas01',
      repo: 'Flow_Auditor',
      token: 'TOK',
      dispatchedAfterMs: Date.now(),
      fetchFn: jest.fn(),
      sleepFn: async () => {},
      timeoutMs: 0,
      intervalMs: 1,
    });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/tardó más de lo esperado/i);
  });
});
