/**
 * Test de regresión — evitar rebote de navegación inicio.html <-> index.html
 * (SRS-FR-M3-309, HU Notion #9).
 *
 * Ejecuta con jsdom el script real de sessionStorage['nfa_landed'] extraído
 * tal cual de cada archivo HTML (no una reimplementación de la lógica), sin
 * necesitar un navegador real ni Playwright/Puppeteer — mismo patrón Jest +
 * jsdom que ya usa el resto de la suite en tests/unit/.
 *
 * jsdom no implementa navegación real de página (`location.replace()` no
 * hace nada salvo loguear "Not implemented: navigation" por su
 * VirtualConsole) y bloquea sobreescribir `location.replace` directamente
 * (a diferencia de un navegador real). Por eso la detección de "intentó
 * redirigir" se hace escuchando ese evento `jsdomError`, combinada con una
 * verificación estática de que el destino literal en el código sigue siendo
 * `'inicio.html'`.
 */
const fs = require('fs');
const path = require('path');

// El entorno jsdom de Jest no expone TextEncoder/TextDecoder en el global
// (a diferencia de Node corriendo solo) y la dependencia whatwg-url de jsdom
// los necesita al importarse — se toman de 'util' antes de requerir 'jsdom'.
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const { JSDOM, VirtualConsole } = require('jsdom');

const RAIZ = path.join(__dirname, '..', '..');

function extraerScriptDeAterrizaje(archivo) {
  const html = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const bloque = bloques.find((codigo) => codigo.includes('nfa_landed'));
  if (!bloque) {
    throw new Error(`No se encontró el script de nfa_landed en ${archivo}`);
  }
  return bloque;
}

// Corre el script extraído dentro de una ventana jsdom aislada y descartable,
// insertándolo como un <script> real (no un Function suelto) para que
// identificadores globales como sessionStorage resuelvan correctamente.
function ejecutarScript(script, sessionStorageInicial = {}) {
  const virtualConsole = new VirtualConsole();
  const intentosDeNavegacion = [];
  virtualConsole.on('jsdomError', (err) => {
    if (err && /navigation/i.test(err.message)) {
      intentosDeNavegacion.push(err.message);
    }
  });

  const { window } = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://nfa.local/pagina-de-prueba.html',
    runScripts: 'dangerously',
    virtualConsole,
  });

  for (const [clave, valor] of Object.entries(sessionStorageInicial)) {
    window.sessionStorage.setItem(clave, valor);
  }

  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = script;
  window.document.head.appendChild(scriptEl);

  return { window, intentosDeNavegacion };
}

describe('inicio.html — marca de aterrizaje (SRS-FR-M3-309)', () => {
  const scriptInicio = extraerScriptDeAterrizaje('inicio.html');

  test('Escenario 1: sin marca previa, la setea y no redirige', () => {
    const { window, intentosDeNavegacion } = ejecutarScript(scriptInicio);

    expect(window.sessionStorage.getItem('nfa_landed')).toBe('1');
    expect(intentosDeNavegacion).toHaveLength(0);
  });
});

describe('index.html — no rebota si ya se aterrizó en inicio.html (SRS-FR-M3-309)', () => {
  const scriptIndex = extraerScriptDeAterrizaje('index.html');

  test('el destino de redirección sigue siendo inicio.html', () => {
    expect(scriptIndex).toEqual(expect.stringContaining("location.replace('inicio.html')"));
  });

  test('Escenario 2: con la marca ya seteada (por inicio.html), no redirige', () => {
    const { intentosDeNavegacion } = ejecutarScript(scriptIndex, { nfa_landed: '1' });

    expect(intentosDeNavegacion).toHaveLength(0);
  });

  test('regresión del bug original (v4.6): sin marca, sí redirige y la deja seteada', () => {
    const { window, intentosDeNavegacion } = ejecutarScript(scriptIndex);

    expect(window.sessionStorage.getItem('nfa_landed')).toBe('1');
    expect(intentosDeNavegacion).toHaveLength(1);
  });
});
