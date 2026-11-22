/**
 * Tests de la lógica pura del módulo Salud (src/utils/salud_logic.js).
 */
const {
  clasificarFasePorNombre,
  obtenerResumenCiclo,
  construirPayloadSesion,
  construirPayloadCiclo,
  construirPayloadPendienteSalud,
} = require('../../src/utils/salud_logic.js');

describe('clasificarFasePorNombre', () => {
  test('identifica las 4 fases del ciclo', () => {
    expect(clasificarFasePorNombre('[11]-Fase menstrual').key).toBe('menstrual');
    expect(clasificarFasePorNombre('[11]-Fase Folicular').key).toBe('folicular');
    expect(clasificarFasePorNombre('[11]-Fase ovulatoria').key).toBe('ovulatoria');
    expect(clasificarFasePorNombre('[10]-Fase Lútea').key).toBe('lutea');
  });
});

describe('obtenerResumenCiclo', () => {
  test('detecta la fase activa para hoy y la próxima fecha futura', () => {
    const fases = [
      { nombre: '[11]-Fase Folicular', inicio: '2026-11-05', fin: '2026-11-14', proximo_inicio: '2026-11-29' },
      { nombre: '[11]-Fase ovulatoria', inicio: '2026-11-15', fin: '2026-11-22', proximo_inicio: '2026-12-09' },
    ];
    expect(obtenerResumenCiclo(fases, '2026-11-21')).toEqual({
      faseActual: '[11]-Fase ovulatoria',
      proximoInicio: '2026-11-29',
    });
  });

  test('sin fases devuelve valores por defecto', () => {
    expect(obtenerResumenCiclo([], '2026-11-21')).toEqual({
      faseActual: 'Sin registros',
      proximoInicio: null,
    });
  });
});

describe('construirPayloadSesion', () => {
  test('rechaza sin nombre o fecha y construye payload válido', () => {
    expect(construirPayloadSesion({ fecha: '2026-11-21' }).ok).toBe(false);
    expect(construirPayloadSesion({
      nombre: 'Caminata',
      fecha: '2026-11-21',
      duracion: '45',
      estado: 'Hecha',
    })).toEqual({
      ok: true,
      payload: { nombre: 'Caminata', fecha: '2026-11-21', duracion: 45, estado: 'Hecha' },
    });
  });
});

describe('construirPayloadCiclo', () => {
  test('arma nombre automático [MM]-Fase y valida orden de fechas', () => {
    expect(construirPayloadCiclo({ fase: 'Fase Folicular', inicio: '2026-11-21', fin: '2026-11-10' }).ok).toBe(false);
    expect(construirPayloadCiclo({ fase: 'Fase Folicular', inicio: '2026-11-21', sintomas: ['Cansancio físico'] })).toEqual({
      ok: true,
      payload: {
        nombre: '[11]-Fase Folicular',
        inicio: '2026-11-21',
        fin: null,
        inicio_real: '2026-11-21',
        fin_real: null,
        sintomas: ['Cansancio físico'],
      },
    });
  });

  test('incluye page_id cuando se pasa pageId para edición', () => {
    const res = construirPayloadCiclo({
      pageId: 'cic-99',
      nombre: '[11]-Fase Folicular',
      inicio: '2026-11-21',
    });
    expect(res.ok).toBe(true);
    expect(res.payload.page_id).toBe('cic-99');
  });
});

describe('construirPayloadPendienteSalud', () => {
  test('valida nombre obligatorio y arma payload', () => {
    expect(construirPayloadPendienteSalud({}).ok).toBe(false);
    expect(construirPayloadPendienteSalud({
      nombre: 'Sacar turno',
      tipo: '💬 Pedir turno',
      fechaLimite: '2026-11-28',
      estado: 'Pendiente',
    })).toEqual({
      ok: true,
      payload: {
        nombre: 'Sacar turno',
        tipo: '💬 Pedir turno',
        fecha_limite: '2026-11-28',
        estado: 'Pendiente',
      },
    });
  });

  test('incluye page_id cuando se pasa pageId para edición', () => {
    const res = construirPayloadCiclo({
      pageId: 'cic-99',
      nombre: '[11]-Fase Folicular',
      inicio: '2026-11-21',
    });
    expect(res.ok).toBe(true);
    expect(res.payload.page_id).toBe('cic-99');
  });
});
