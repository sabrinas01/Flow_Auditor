/**
 * Tests de renderizado DOM (src/utils/dom_render.js) con Jest + jsdom.
 * Antes del refactor esta lógica vivía inline en index.html y no tenía
 * ningún test — solo estaba testeado el cálculo puro, no el pintado del DOM.
 *
 * dom_render.js espera escapeHtml/obtenerEstiloEstado/ordenarEntradasPorJerarquia
 * como globals (igual que en el navegador, donde llegan por el <script> de
 * dashboard_logic.js que carga antes) — por eso se exponen con Object.assign(global, ...)
 * antes de requerir dom_render.js.
 */
const dashboardLogic = require('../../src/utils/dashboard_logic.js');
Object.assign(global, dashboardLogic);

const {
  renderizarFilasEstados,
  toggleBloque,
  renderizarRecordatoriosVarios,
  formatHora,
  renderizarAgendaEventos,
  crearManejadorDeRefresco,
} = require('../../src/utils/dom_render.js');
const debounce = require('../../src/utils/debounce.js');

describe('renderizarFilasEstados', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="list-test"></div>';
  });

  test('sin datos, muestra el mensaje de "Sin planificación registrada"', () => {
    renderizarFilasEstados('list-test', {});
    expect(document.getElementById('list-test').textContent).toContain('Sin planificación registrada');
  });

  test('renderiza una .status-row por cada estado', () => {
    renderizarFilasEstados('list-test', { 'Hecha': 4, 'Sin empezar': 13, '⏭️ No necesaria': 2 });
    const filas = document.querySelectorAll('#list-test .status-row');
    expect(filas.length).toBe(3);
  });

  test('muestra la cantidad correcta en cada fila', () => {
    renderizarFilasEstados('list-test', { 'Hecha': 4 });
    expect(document.querySelector('#list-test .status-row').textContent).toContain('4');
  });

  test('respeta la jerarquía de estados en el orden en que quedan en el DOM', () => {
    renderizarFilasEstados('list-test', {
      'Fallida / Vencida': 1,
      'Hecha': 2,
      'Sin empezar': 3,
      'En ejecución': 4,
    });
    const nombresEnOrden = [...document.querySelectorAll('#list-test .status-row')]
      .map(fila => fila.querySelector('span:not(.material-symbols-outlined)').textContent);
    expect(nombresEnOrden).toEqual(['Sin empezar', 'En ejecución', 'Hecha', 'Fallida / Vencida']);
  });

  test('aplica la pill verde a un estado completado', () => {
    renderizarFilasEstados('list-test', { 'Hecha': 1 });
    expect(document.querySelector('#list-test .status-row').className).toContain('left-pill-green');
  });

  test('escapa HTML en el nombre del estado (previene XSS)', () => {
    renderizarFilasEstados('list-test', { '<img src=x onerror=alert(1)>': 1 });
    const html = document.getElementById('list-test').innerHTML;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('toggleBloque', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button aria-expanded="true">
        <span id="chevron-ayer"></span>
      </button>
      <div id="content-ayer"></div>
    `;
  });

  test('la primera vez colapsa: agrega "hidden", rota el chevron y aria-expanded=false', () => {
    toggleBloque('ayer');
    expect(document.getElementById('content-ayer').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('chevron-ayer').style.transform).toBe('rotate(-90deg)');
    expect(document.querySelector('button').getAttribute('aria-expanded')).toBe('false');
  });

  test('la segunda vez expande de nuevo: saca "hidden" y aria-expanded=true', () => {
    toggleBloque('ayer');
    toggleBloque('ayer');
    expect(document.getElementById('content-ayer').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('chevron-ayer').style.transform).toBe('rotate(0deg)');
    expect(document.querySelector('button').getAttribute('aria-expanded')).toBe('true');
  });
});

// Extraída de recordatorios-varios.html en v4.23 (SRS-FR-M4-404, HU Notion Épica 2 #11)
describe('renderizarRecordatoriosVarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="list-varios-hoy"></div><span id="total-varios-hoy-lbl"></span>';
  });

  test('sin ítems, muestra el mensaje de "Sin recordatorios registrados"', () => {
    renderizarRecordatoriosVarios('varios-hoy', []);
    expect(document.getElementById('list-varios-hoy').textContent).toContain('Sin recordatorios registrados');
  });

  test('renderiza Nombre/Estado/Prioridad/Área/Periodo/Fecha de cada ítem', () => {
    renderizarRecordatoriosVarios('varios-hoy', [
      { nombre: 'Pagar el alquiler', estado: 'Sin empezar', prioridad: 'Alta', area: 'Personal', periodo: 'Mensual', fecha: '10/09/2026' },
    ]);
    const fila = document.querySelector('#list-varios-hoy .status-row');
    expect(fila.textContent).toContain('Pagar el alquiler');
    expect(fila.textContent).toContain('Sin empezar');
    expect(fila.textContent).toContain('Alta');
    expect(fila.textContent).toContain('Personal');
    expect(fila.textContent).toContain('Mensual');
    expect(fila.textContent).toContain('10/09/2026');
  });

  test('muestra la cantidad correcta de ítems en el total', () => {
    renderizarRecordatoriosVarios('varios-hoy', [
      { nombre: 'a', estado: 'Hecha' },
      { nombre: 'b', estado: 'Hecha' },
    ]);
    expect(document.getElementById('total-varios-hoy-lbl').innerText).toBe('2 ítems');
  });

  test.each([
    ['Hecha', 'left-pill-green'],
    ['❌ Fallida / Vencida', 'left-pill-red'],
    ['Sin empezar', 'left-pill-blue'],
  ])('aplica la pill correcta para el estado "%s"', (estado, pillEsperada) => {
    renderizarRecordatoriosVarios('varios-hoy', [{ nombre: 'x', estado }]);
    expect(document.querySelector('#list-varios-hoy .status-row').className).toContain(pillEsperada);
  });

  test('escapa HTML en nombre y metadatos (previene XSS)', () => {
    renderizarRecordatoriosVarios('varios-hoy', [
      { nombre: '<img src=x onerror=alert(1)>', estado: 'Sin empezar', area: '<script>alert(2)</script>' },
    ]);
    const html = document.getElementById('list-varios-hoy').innerHTML;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>alert');
  });
});

// Extraída de agenda-personal.html en v4.23 (SRS-FR-M5-505, HU Notion Épica 2 #11)
describe('formatHora', () => {
  test('extrae HH:MM de un ISO-8601 completo', () => {
    expect(formatHora('2026-09-15T14:30:00.000-03:00')).toBe('14:30');
  });

  test('sin horario (null/undefined), devuelve "--:--"', () => {
    expect(formatHora(null)).toBe('--:--');
    expect(formatHora(undefined)).toBe('--:--');
  });

  test('string sin formato de hora reconocible, devuelve "--:--"', () => {
    expect(formatHora('no-es-una-fecha')).toBe('--:--');
  });
});

describe('renderizarAgendaEventos', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="list-eventos-hoy"></div><span id="total-eventos-hoy-lbl"></span>';
  });

  test('sin eventos, muestra el mensaje de "Sin eventos registrados"', () => {
    renderizarAgendaEventos('eventos-hoy', []);
    expect(document.getElementById('list-eventos-hoy').textContent).toContain('Sin eventos registrados');
  });

  test('renderiza hora de inicio-fin, nombre y lugar de cada evento', () => {
    renderizarAgendaEventos('eventos-hoy', [
      { nombre: 'Turno médico', inicio: '2026-09-15T09:00:00-03:00', fin: '2026-09-15T10:00:00-03:00', lugar: 'Clínica Central' },
    ]);
    const fila = document.querySelector('#list-eventos-hoy .status-row');
    expect(fila.textContent).toContain('Turno médico');
    expect(fila.textContent).toContain('09:00');
    expect(fila.textContent).toContain('10:00');
    expect(fila.textContent).toContain('Clínica Central');
  });

  test('muestra la cantidad correcta de eventos en el total', () => {
    renderizarAgendaEventos('eventos-hoy', [{ nombre: 'a' }, { nombre: 'b' }]);
    expect(document.getElementById('total-eventos-hoy-lbl').innerText).toBe('2 eventos');
  });

  test.each([
    ['eventos-ayer', 'left-pill-blue'],
    ['eventos-hoy', 'left-pill-red'],
    ['eventos-manana', 'left-pill-orange'],
  ])('usa la pill correcta según el bloque cronológico (%s)', (prefijo, pillEsperada) => {
    document.body.innerHTML = `<div id="list-${prefijo}"></div><span id="total-${prefijo}-lbl"></span>`;
    renderizarAgendaEventos(prefijo, [{ nombre: 'x' }]);
    expect(document.querySelector(`#list-${prefijo} .status-row`).className).toContain(pillEsperada);
  });

  test('escapa HTML en nombre y lugar (previene XSS)', () => {
    renderizarAgendaEventos('eventos-hoy', [
      { nombre: '<img src=x onerror=alert(1)>', lugar: '<script>alert(2)</script>' },
    ]);
    const html = document.getElementById('list-eventos-hoy').innerHTML;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>alert');
  });
});

// Extraída de index.html/recordatorios-varios.html/agenda-personal.html en
// v4.24 (SRS-FR-M3-305, HU Notion Épica 2 #12). onRecargar es inyectable
// para no depender de location.reload(), que jsdom no implementa.
describe('crearManejadorDeRefresco', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<button id="btn-refresh"><span id="icon-refresh"></span></button>';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Escenario 1 (SRS-FR-M3-305): al presionar, agrega spin-animation y deshabilita el botón de inmediato, sin recargar todavía', () => {
    const onRecargar = jest.fn();
    const recargarDashboard = crearManejadorDeRefresco(debounce, { onRecargar });

    recargarDashboard();

    expect(document.getElementById('icon-refresh').classList.contains('spin-animation')).toBe(true);
    expect(document.getElementById('btn-refresh').disabled).toBe(true);
    expect(onRecargar).not.toHaveBeenCalled();
  });

  test('tras el debounce (1200ms), quita spin-animation, rehabilita el botón y dispara la recarga', () => {
    const onRecargar = jest.fn();
    const recargarDashboard = crearManejadorDeRefresco(debounce, { onRecargar });

    recargarDashboard();
    jest.advanceTimersByTime(1200);

    expect(document.getElementById('icon-refresh').classList.contains('spin-animation')).toBe(false);
    expect(document.getElementById('btn-refresh').disabled).toBe(false);
    expect(onRecargar).toHaveBeenCalledTimes(1);
  });

  test('clicks repetidos dentro de la ventana de debounce colapsan en una sola recarga (sin llamados repetidos)', () => {
    const onRecargar = jest.fn();
    const recargarDashboard = crearManejadorDeRefresco(debounce, { onRecargar });

    recargarDashboard();
    jest.advanceTimersByTime(600);
    recargarDashboard();
    jest.advanceTimersByTime(600);
    recargarDashboard();
    jest.advanceTimersByTime(1200);

    expect(onRecargar).toHaveBeenCalledTimes(1);
  });
});
