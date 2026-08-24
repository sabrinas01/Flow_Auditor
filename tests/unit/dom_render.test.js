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

const { renderizarFilasEstados, toggleBloque } = require('../../src/utils/dom_render.js');

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
