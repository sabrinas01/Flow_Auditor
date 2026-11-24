/**
 * Tests de la lógica pura del módulo Salud (src/utils/salud_logic.js).
 */
const {
  clasificarFasePorNombre,
  obtenerResumenCiclo,
  construirPayloadSesion,
  construirPayloadCiclo,
  construirPayloadPendienteSalud,
  calcularMetricasSesiones,
  calcularResumenMenteSalud,
  calcularEnergiaDesdeCiclo,
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
  test('detecta la fase activa y obtiene nombre y próximo inicio de la siguiente fase del ciclo', () => {
    const fases = [
      { nombre: '[10-11]-Fase menstrual', inicio: '2026-10-30', fin: '2026-11-04', proximo_inicio: '2026-11-23' },
      { nombre: '[11]-Fase Folicular', inicio: '2026-11-05', fin: '2026-11-14', proximo_inicio: '2026-11-29' },
      { nombre: '[11]-Fase ovulatoria', inicio: '2026-11-15', fin: '2026-11-19', proximo_inicio: '2026-12-09' },
      { nombre: '[11]-Fase Lútea', inicio: '2026-11-20', fin: '2026-11-25', proximo_inicio: '2026-12-14' },
    ];
    expect(obtenerResumenCiclo(fases, '2026-11-22')).toEqual({
      faseActual: '[11]-Fase Lútea',
      proximoInicio: '2026-11-23',
      proximaFase: 'Fase menstrual',
      proximaFaseEmoji: '❄️',
    });
  });

  test('sin fases devuelve valores por defecto', () => {
    expect(obtenerResumenCiclo([], '2026-11-21')).toEqual({
      faseActual: 'Sin registros',
      proximoInicio: null,
      proximaFase: null,
      proximaFaseEmoji: null,
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

  test('clasificarFasePorNombre asigna el emoji de estación a cada fase', () => {
    const { clasificarFasePorNombre } = require('../../src/utils/salud_logic');
    expect(clasificarFasePorNombre('[11]-Fase menstrual').emoji).toBe('❄️');
    expect(clasificarFasePorNombre('[11]-Fase Folicular').emoji).toBe('🌸');
    expect(clasificarFasePorNombre('[11]-Fase ovulatoria').emoji).toBe('☀️');
    expect(clasificarFasePorNombre('[11]-Fase Lútea').emoji).toBe('🍂');
  });
});

describe('Salud reagrupada (Sesiones, Mente y Energía)', () => {
  test('calcularMetricasSesiones computa frecuencia semanal, minutos y consistencia', () => {
    const sesiones = [
      { nombre: 'Pilates', fecha: '2026-11-24', duracion: 45, estado: 'Hecha' },
      { nombre: 'Caminata', fecha: '2026-11-22', duracion: 30, estado: 'Hecha' },
      { nombre: 'Yoga', fecha: '2026-11-20', duracion: 25, estado: 'Sin empezar' },
      { nombre: 'Vieja', fecha: '2026-11-01', duracion: 60, estado: 'Hecha' },
    ];
    expect(calcularMetricasSesiones(sesiones, '2026-11-24')).toEqual({
      sesionesSemana: 2,
      minutosActivos: 75,
      consistenciaPct: 67,
      totalRegistros: 4,
    });
  });

  test('calcularResumenMenteSalud promedia calma/energía, cuenta S.T.O.P. y extrae reflexión', () => {
    const regs = [
      { fecha: '2026-11-24', barometro: '🟢 Estable', calma: 8, energia: 7, stop: true, reflexion: 'Respire profundo' },
      { fecha: '2026-11-23', barometro: '🟡 En alerta', calma: 6, energia: 5, stop: false, reflexion: '' },
    ];
    expect(calcularResumenMenteSalud(regs)).toEqual({
      totalRegistros: 2,
      calmaPromedio: 7,
      energiaPromedio: 6,
      pausasStop: 1,
      barometroActual: '🟢 Estable',
      ultimaReflexion: 'Respire profundo',
      ultimaFecha: '2026-11-24',
    });
  });

  test('calcularEnergiaDesdeCiclo usa energía real de Mente si existe y curva de la fase del ciclo', () => {
    const fases = [{ nombre: '[11]-Fase Lútea', inicio: '2026-11-20', fin: '2026-11-26' }];
    const regs = [{ energia: 8, calma: 7, stop: false }];
    const res = calcularEnergiaDesdeCiclo(fases, regs, '2026-11-24');
    expect(res.faseKey).toBe('lutea');
    expect(res.puntaje).toBe(8);
    expect(res.fuentePuntaje).toBe('Gestión emocional');
    expect(res.curva).toHaveLength(3);
    expect(res.factores).toHaveLength(3);
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

  test('clasificarFasePorNombre asigna el emoji de estación a cada fase', () => {
    const { clasificarFasePorNombre } = require('../../src/utils/salud_logic');
    expect(clasificarFasePorNombre('[11]-Fase menstrual').emoji).toBe('❄️');
    expect(clasificarFasePorNombre('[11]-Fase Folicular').emoji).toBe('🌸');
    expect(clasificarFasePorNombre('[11]-Fase ovulatoria').emoji).toBe('☀️');
    expect(clasificarFasePorNombre('[11]-Fase Lútea').emoji).toBe('🍂');
  });
});

describe('Salud reagrupada (Sesiones, Mente y Energía)', () => {
  test('calcularMetricasSesiones computa frecuencia semanal, minutos y consistencia', () => {
    const sesiones = [
      { nombre: 'Pilates', fecha: '2026-11-24', duracion: 45, estado: 'Hecha' },
      { nombre: 'Caminata', fecha: '2026-11-22', duracion: 30, estado: 'Hecha' },
      { nombre: 'Yoga', fecha: '2026-11-20', duracion: 25, estado: 'Sin empezar' },
      { nombre: 'Vieja', fecha: '2026-11-01', duracion: 60, estado: 'Hecha' },
    ];
    expect(calcularMetricasSesiones(sesiones, '2026-11-24')).toEqual({
      sesionesSemana: 2,
      minutosActivos: 75,
      consistenciaPct: 67,
      totalRegistros: 4,
    });
  });

  test('calcularResumenMenteSalud promedia calma/energía, cuenta S.T.O.P. y extrae reflexión', () => {
    const regs = [
      { fecha: '2026-11-24', barometro: '🟢 Estable', calma: 8, energia: 7, stop: true, reflexion: 'Respire profundo' },
      { fecha: '2026-11-23', barometro: '🟡 En alerta', calma: 6, energia: 5, stop: false, reflexion: '' },
    ];
    expect(calcularResumenMenteSalud(regs)).toEqual({
      totalRegistros: 2,
      calmaPromedio: 7,
      energiaPromedio: 6,
      pausasStop: 1,
      barometroActual: '🟢 Estable',
      ultimaReflexion: 'Respire profundo',
      ultimaFecha: '2026-11-24',
    });
  });

  test('calcularEnergiaDesdeCiclo usa energía real de Mente si existe y curva de la fase del ciclo', () => {
    const fases = [{ nombre: '[11]-Fase Lútea', inicio: '2026-11-20', fin: '2026-11-26' }];
    const regs = [{ energia: 8, calma: 7, stop: false }];
    const res = calcularEnergiaDesdeCiclo(fases, regs, '2026-11-24');
    expect(res.faseKey).toBe('lutea');
    expect(res.puntaje).toBe(8);
    expect(res.fuentePuntaje).toBe('Gestión emocional');
    expect(res.curva).toHaveLength(3);
    expect(res.factores).toHaveLength(3);
  });
});
