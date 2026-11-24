const {
  PILARES_DESARROLLO,
  TIPOS_DESARROLLO,
  ESTADOS_DESARROLLO,
  calcularResumenDesarrollo,
  construirPayloadDesarrollo,
} = require('../../src/utils/desarrollo_personal_logic.js');

describe('desarrollo_personal_logic', () => {
  test('calcularResumenDesarrollo agrupa por pilar, calcula progreso y puntaje promedio', () => {
    const regs = [
      { pilar: '🗣️ Comunicación', tipo: '💬 Conversación', estado: 'Completado', puntaje: 9 },
      { pilar: '💖 Autoestima', tipo: '🏆 Logro / Validación', estado: 'Integrado', puntaje: 8 },
      { pilar: '🧭 Autoconocimiento', tipo: '🏋️ Ejercicio práctico', estado: 'En curso', puntaje: null },
    ];
    expect(calcularResumenDesarrollo(regs)).toEqual({
      total: 3,
      completados: 2,
      porcentajeProgreso: 67,
      ejerciciosActivos: 1,
      promedioPuntaje: 8.5,
      porPilar: {
        comunicacion: 1,
        autoestima: 1,
        autoconocimiento: 1,
      },
    });
  });

  test('construirPayloadDesarrollo valida nombre obligatorio y rango de puntaje', () => {
    expect(construirPayloadDesarrollo({ nombre: '' }).ok).toBe(false);
    expect(construirPayloadDesarrollo({ nombre: 'Test', puntaje: 120 }).ok).toBe(false);

    const res = construirPayloadDesarrollo({
      pageId: 'dp-1',
      nombre: 'Escucha activa 3s',
      pilar: PILARES_DESARROLLO[0],
      tipo: TIPOS_DESARROLLO[4],
      estado: ESTADOS_DESARROLLO[1],
      fecha: '2026-11-24',
      frecuenciaTecnica: 'DIARIO • 5 MIN',
      puntaje: '9',
      recursoAsociado: 'Hábitos Atómicos',
      enlace: 'https://ejemplo.com',
      nota: 'Pausa antes de responder',
    });
    expect(res).toEqual({
      ok: true,
      payload: {
        page_id: 'dp-1',
        nombre: 'Escucha activa 3s',
        pilar: '🗣️ Comunicación',
        tipo: '🏋️ Ejercicio práctico',
        estado: 'En curso',
        fecha: '2026-11-24',
        frecuencia_tecnica: 'DIARIO • 5 MIN',
        puntaje: 9,
        recurso_asociado: 'Hábitos Atómicos',
        enlace: 'https://ejemplo.com',
        nota: 'Pausa antes de responder',
      },
    });
  });
});
