/**
 * Tests de la lógica pura del módulo Relaciones y límites.
 */
const {
  calcularResumenRelaciones,
  construirPayloadAfirmacion,
  construirPayloadFrase,
} = require('../../src/utils/relaciones_logic.js');

describe('calcularResumenRelaciones', () => {
  test('calcula totales de afirmaciones, integradas y frases', () => {
    expect(calcularResumenRelaciones(
      [{ integrada: true }, { integrada: false }],
      [{ frase: 'No es no' }]
    )).toEqual({
      totalAfirmaciones: 2,
      integradas: 1,
      totalFrases: 1,
    });
  });
});

describe('construirPayloadAfirmacion y construirPayloadFrase', () => {
  test('validan obligatorios y agregan page_id en edición', () => {
    expect(construirPayloadAfirmacion({}).ok).toBe(false);
    expect(construirPayloadFrase({}).ok).toBe(false);

    const af = construirPayloadAfirmacion({
      pageId: 'af-1',
      nombre: 'Mi tiempo vale',
      categoria: '🛡️ Autorrespeto',
      integrada: true,
    });
    expect(af.ok).toBe(true);
    expect(af.payload.page_id).toBe('af-1');

    const fr = construirPayloadFrase({
      pageId: 'fr-1',
      frase: 'Gracias por pensar en mí, esta vez no puedo.',
      autor: 'Sabry',
    });
    expect(fr.ok).toBe(true);
    expect(fr.payload.page_id).toBe('fr-1');
  });
});
