const {
  MODULOS_HABITOS,
  ESTADOS_FORMACION,
  calcularResumenHabitos,
  construirPayloadHabito,
} = require('../../src/utils/habitos_logic.js');

describe('habitos_logic', () => {
  test('calcularResumenHabitos separa hábitos y formaciones y calcula racha máxima', () => {
    const items = [
      { modulo: '🔥 Hábito', estado: 'Activo', racha_progreso: 14 },
      { modulo: '🔥 Hábito', estado: 'En pausa', racha_progreso: 3 },
      { modulo: '🎓 Formación / Curso', estado: 'En progreso', racha_progreso: 60 },
      { modulo: '🎓 Formación / Curso', estado: 'Completado', racha_progreso: 100 },
    ];
    expect(calcularResumenHabitos(items)).toEqual({
      totalHabitos: 2,
      habitosActivos: 1,
      rachaMaxima: 14,
      totalFormaciones: 2,
      formacionesEnCurso: 1,
      formacionesCompletadas: 1,
    });
  });

  test('construirPayloadHabito valida nombre obligatorio y arma payload para edición', () => {
    expect(construirPayloadHabito({ nombre: '' }).ok).toBe(false);
    expect(construirPayloadHabito({ nombre: 'Leer', rachaProgreso: -1 }).ok).toBe(false);

    expect(construirPayloadHabito({
      pageId: 'hab-1',
      nombre: 'Curso TypeScript',
      modulo: MODULOS_HABITOS[1],
      estado: ESTADOS_FORMACION[1],
      categoria: '💼 Carrera & Tech',
      frecuenciaMeta: '10 módulos',
      rachaProgreso: '50',
      ultimaFecha: '2026-11-24',
      nota: 'Módulo 5 en curso',
    })).toEqual({
      ok: true,
      payload: {
        page_id: 'hab-1',
        nombre: 'Curso TypeScript',
        modulo: '🎓 Formación / Curso',
        estado: 'En progreso',
        categoria: '💼 Carrera & Tech',
        frecuencia_meta: '10 módulos',
        racha_progreso: 50,
        ultima_fecha: '2026-11-24',
        nota: 'Módulo 5 en curso',
      },
    });
  });
});
