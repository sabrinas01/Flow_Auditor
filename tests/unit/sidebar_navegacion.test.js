/**
 * Cobertura estática para requisitos visuales/posicionales del sidebar que no
 * tenían test (SRS-FR-M3-310, SRS-FR-M3-312 — HU Notion Épica 2 #12).
 *
 * No usa jsdom ni un navegador real: parsea con regex el <nav> real de cada
 * página (mismo enfoque que tests/test_publicacion_gh_pages.py para el
 * workflow de gh-pages) y verifica el orden/destino de los links, no una
 * reimplementación de la lógica. El orden fijo esperado (SRS-FR-M3-312)
 * incluye por definición que "Recordatorios varios" enlace a
 * recordatorios-varios.html (SRS-FR-M3-310), así que un solo assert cubre
 * ambos requisitos.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');

function extraerHrefsDelSidebar(archivo) {
  const html = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
  const navMatch = html.match(/<nav class="flex-1 space-y-2">([\s\S]*?)<\/nav>/);
  if (!navMatch) {
    throw new Error(`No se encontró el <nav> del sidebar en ${archivo}`);
  }
  return [...navMatch[1].matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
}

describe('Orden fijo del menú de navegación (SRS-FR-M3-312) y link a Recordatorios Varios (SRS-FR-M3-310)', () => {
  test('index.html: Inicio, Agenda personal, Recordatorios diarios, Recordatorios varios', () => {
    expect(extraerHrefsDelSidebar('index.html')).toEqual([
      'inicio.html', 'agenda-personal.html', 'index.html', 'recordatorios-varios.html',
    ]);
  });

  test('recordatorios-varios.html: Inicio, Agenda personal, Recordatorios diarios, Recordatorios varios', () => {
    expect(extraerHrefsDelSidebar('recordatorios-varios.html')).toEqual([
      'inicio.html', 'agenda-personal.html', 'index.html', 'recordatorios-varios.html',
    ]);
  });

  test('agenda-personal.html: Inicio, Agenda personal, Recordatorios diarios, Recordatorios varios', () => {
    expect(extraerHrefsDelSidebar('agenda-personal.html')).toEqual([
      'inicio.html', 'agenda-personal.html', 'index.html', 'recordatorios-varios.html',
    ]);
  });

  test('inicio.html: sin ítem "Inicio" (es la página actual) — Agenda personal, Recordatorios diarios, Recordatorios varios', () => {
    expect(extraerHrefsDelSidebar('inicio.html')).toEqual([
      'agenda-personal.html', 'index.html', 'recordatorios-varios.html',
    ]);
  });
});
