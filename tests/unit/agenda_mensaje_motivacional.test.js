/**
 * Escenario 1 (HU Notion Épica 2 #8): mensaje motivacional estático debajo
 * de la card "Eventos de hoy" en agenda-personal.html. Chequeo estático
 * sobre el HTML real (mismo enfoque que tests/unit/sidebar_navegacion.test.js),
 * no una reimplementación del render.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const MENSAJE = 'Linda, si es posible agenda el tiempo de transporte y preparación y si vuelves caminando para que cuente como actividad física 😉';

describe('Mensaje motivacional en agenda-personal.html', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'agenda-personal.html'), 'utf8');

  test('el mensaje literal aparece en la página', () => {
    expect(html).toContain(MENSAJE);
  });

  test('aparece debajo de la lista de "Eventos de hoy" (dentro de esa misma card)', () => {
    const idxListaHoy = html.indexOf('id="list-eventos-hoy"');
    const idxMensaje = html.indexOf(MENSAJE);
    const idxCierreCardHoy = html.indexOf('</article>', idxListaHoy);

    expect(idxListaHoy).toBeGreaterThan(-1);
    expect(idxMensaje).toBeGreaterThan(idxListaHoy);
    expect(idxMensaje).toBeLessThan(idxCierreCardHoy);
  });
});
