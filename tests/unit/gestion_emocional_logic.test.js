/**
 * Tests de la lógica pura del módulo Gestión emocional.
 */
const {
  calcularResumenEmocional,
  construirPayloadRegistroEmocional,
} = require('../../src/utils/gestion_emocional_logic.js');

describe('calcularResumenEmocional', () => {
  test('devuelve valores por defecto sin registros', () => {
    expect(calcularResumenEmocional([])).toEqual({
      total: 0,
      calmaPromedio: '0.0',
      energiaPromedio: '0.0',
      predominante: 'Sin registros',
      conStop: 0,
    });
  });

  test('calcula promedios, predominante y cantidad con S.T.O.P.', () => {
    const res = calcularResumenEmocional([
      { barometro: '😌 En calma', calma: 8, energia: 7, stop: true },
      { barometro: '😌 En calma', calma: 9, energia: 8, stop: false },
      { barometro: '😰 Ansiosa', calma: 4, energia: 6, stop: true },
    ]);
    expect(res.total).toBe(3);
    expect(res.calmaPromedio).toBe('7.0');
    expect(res.predominante).toBe('😌 En calma');
    expect(res.conStop).toBe(2);
  });
});

describe('construirPayloadRegistroEmocional', () => {
  test('valida nombre y fecha y acota calma/energía 1..10', () => {
    expect(construirPayloadRegistroEmocional({ fecha: '2026-11-23' }).ok).toBe(false);
    expect(construirPayloadRegistroEmocional({ nombre: 'Check-in' }).ok).toBe(false);
    const res = construirPayloadRegistroEmocional({
      pageId: 'emo-1',
      nombre: 'Pausa tarde',
      fecha: '2026-11-23',
      barometro: '😌 En calma',
      calma: 15,
      energia: 0,
      stop: true,
    });
    expect(res.ok).toBe(true);
    expect(res.payload.page_id).toBe('emo-1');
    expect(res.payload.calma).toBe(10);
    expect(res.payload.energia).toBe(1);
    expect(res.payload.stop).toBe(true);
  });
});
