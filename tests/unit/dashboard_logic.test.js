/**
 * Tests de la lógica de cálculo pura del dashboard (src/utils/dashboard_logic.js).
 * Cubren: escapeHtml, esEstadoCompletado, obtenerEstiloEstado, calcularMetricas
 * (motor de consistencia), generarUltimos7Dias y calcularResumenSemanal (alerta
 * de bienestar, SRS-FR-M3-306).
 */
const {
  escapeHtml,
  esEstadoCompletado,
  obtenerEstiloEstado,
  calcularMetricas,
  generarUltimos7Dias,
  calcularResumenSemanal,
} = require('../../src/utils/dashboard_logic.js');

describe('escapeHtml', () => {
  test('escapa los 5 caracteres especiales de HTML', () => {
    expect(escapeHtml(`<script>alert('&"XSS"')</script>`)).toBe(
      '&lt;script&gt;alert(&#39;&amp;&quot;XSS&quot;&#39;)&lt;/script&gt;'
    );
  });

  test('texto sin caracteres especiales queda igual', () => {
    expect(escapeHtml('Sin empezar')).toBe('Sin empezar');
  });
});

describe('esEstadoCompletado', () => {
  test.each([
    ['Hecha', true],
    ['hecho', true],
    ['Completada', true],
    ['done', true],
    ['Hecha por otra persona', true],
    ['Sin empezar', false],
    ['En ejecución', false],
    ['Fallida / Vencida', false],
  ])('%s -> %s', (estado, esperado) => {
    expect(esEstadoCompletado(estado)).toBe(esperado);
  });
});

describe('obtenerEstiloEstado', () => {
  test('estado completado usa la pill verde', () => {
    expect(obtenerEstiloEstado('Hecha').pill).toBe('left-pill-green');
  });

  test('estado fallido/vencido usa la pill roja con ícono close', () => {
    const estilo = obtenerEstiloEstado('Fallida / Vencida');
    expect(estilo.pill).toBe('left-pill-red');
    expect(estilo.icon).toBe('close');
  });

  test('estado "no necesaria" usa ícono fast_forward', () => {
    expect(obtenerEstiloEstado('No necesaria').icon).toBe('fast_forward');
  });

  test('estado en progreso usa ícono hourglass_top', () => {
    expect(obtenerEstiloEstado('En ejecución').icon).toBe('hourglass_top');
  });

  test('estado desconocido cae al estilo por defecto sin ícono', () => {
    const estilo = obtenerEstiloEstado('Estado Inventado XYZ');
    expect(estilo.pill).toBe('left-pill-blue');
    expect(estilo.icon).toBeNull();
  });
});

describe('calcularMetricas', () => {
  test('fórmula: (Hecha AND consistencia) / total * 100, redondeado por toFixed en el llamador', () => {
    const m = calcularMetricas({ 'Hecha': 4, 'Sin empezar': 13, '⏭️ No necesaria': 4, '❌ Fallida / Vencida': 6 });
    expect(m.total).toBe(27);
    expect(m.hechas).toBe(4);
    expect(m.tasa).toBeCloseTo((4 / 27) * 100, 5);
  });

  test('total 0 no divide por cero y se considera "ok" (sin alerta)', () => {
    const m = calcularMetricas({});
    expect(m.total).toBe(0);
    expect(m.tasa).toBe(0);
    expect(m.consistenciaOk).toBe(true);
    expect(m.alerta).toBe(false);
  });

  test('tasa >= 70% no dispara alerta', () => {
    const m = calcularMetricas({ 'Hecha': 7, 'Sin empezar': 3 });
    expect(m.tasa).toBe(70);
    expect(m.consistenciaOk).toBe(true);
    expect(m.alerta).toBe(false);
  });

  test('tasa < 70% dispara alerta', () => {
    const m = calcularMetricas({ 'Hecha': 6, 'Sin empezar': 4 });
    expect(m.tasa).toBe(60);
    expect(m.consistenciaOk).toBe(false);
    expect(m.alerta).toBe(true);
  });

  test('suma completadas de varios alias de "Hecha" a la vez', () => {
    const m = calcularMetricas({ 'Hecha': 2, 'Hecha por otra persona': 3, 'Sin empezar': 5 });
    expect(m.hechas).toBe(5);
  });
});

describe('generarUltimos7Dias', () => {
  test('devuelve 7 fechas, la primera es "hoy", en orden descendente', () => {
    const dias = generarUltimos7Dias('15/01/2026');
    expect(dias).toHaveLength(7);
    expect(dias[0]).toBe('15/01/2026');
    expect(dias[6]).toBe('09/01/2026');
  });

  test('cruza correctamente el borde de mes', () => {
    const dias = generarUltimos7Dias('03/02/2026');
    expect(dias).toEqual([
      '03/02/2026', '02/02/2026', '01/02/2026',
      '31/01/2026', '30/01/2026', '29/01/2026', '28/01/2026',
    ]);
  });

  test('cruza correctamente el borde de año', () => {
    const dias = generarUltimos7Dias('02/01/2026');
    expect(dias).toEqual([
      '02/01/2026', '01/01/2026', '31/12/2025',
      '30/12/2025', '29/12/2025', '28/12/2025', '27/12/2025',
    ]);
  });
});

describe('calcularResumenSemanal', () => {
  const dias7 = generarUltimos7Dias('15/01/2026');

  test('sin datos en cache: todos los días son "sin dato", no hay alerta', () => {
    const r = calcularResumenSemanal({}, dias7);
    expect(r.diasBajosCount).toBe(0);
    expect(r.mostrarAlerta).toBe(false);
    expect(r.filas.every(f => !f.tieneDato)).toBe(true);
  });

  test('con menos de 4 días bajos, no muestra alerta', () => {
    const cache = { '15/01/2026': 50, '14/01/2026': 60, '13/01/2026': 65 };
    const r = calcularResumenSemanal(cache, dias7);
    expect(r.diasBajosCount).toBe(3);
    expect(r.mostrarAlerta).toBe(false);
  });

  test('con 4 o más días bajos (<70%), muestra la alerta de bienestar', () => {
    const cache = {
      '15/01/2026': 50, '14/01/2026': 60, '13/01/2026': 65, '12/01/2026': 20,
    };
    const r = calcularResumenSemanal(cache, dias7);
    expect(r.diasBajosCount).toBe(4);
    expect(r.mostrarAlerta).toBe(true);
  });

  test('un día con tasa exactamente 70 NO cuenta como "bajo"', () => {
    const cache = { '15/01/2026': 70 };
    const r = calcularResumenSemanal(cache, dias7);
    expect(r.diasBajosCount).toBe(0);
  });
});
