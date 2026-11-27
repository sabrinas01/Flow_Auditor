const {
  MODULOS_HABITOS,
  ESTADOS_FORMACION,
  calcularResumenHabitos,
  construirPayloadHabito,
  construirPayloadFormacion,
  estaHabitoHechoHoy,
  estaHabitoCongeladoHoy,
  completarHabitoHoy,
  alternarCongelacionHabitoHoy,
  calcularMatriz52Semanas,
} = require('../../src/utils/habitos_logic.js');

describe('habitos_logic', () => {
  test('calcularResumenHabitos separa hábitos y formaciones y calcula racha máxima', () => {
    const habitos = [
      { modulo: '🔥 Hábito', estado: 'Activo', racha_progreso: 14 },
      { modulo: '🔥 Hábito', estado: 'En pausa', racha_progreso: 3 },
    ];
    const formaciones = [
      { estado: 'En curso' },
      { estado: 'Terminado' },
    ];
    expect(calcularResumenHabitos(habitos, formaciones)).toEqual({
      totalHabitos: 2,
      habitosActivos: 1,
      rachaMaxima: 14,
      totalFormaciones: 2,
      formacionesEnCurso: 1,
      formacionesCompletadas: 1,
    });
  });

  test('construirPayloadFormacion valida tema y fechas y arma payload real de Mis cursos', () => {
    expect(construirPayloadFormacion({ tema: '' }).ok).toBe(false);
    expect(construirPayloadFormacion({ tema: 'API REST', inicio: '2026-11-24', fin: '2026-11-01' }).ok).toBe(false);
    expect(construirPayloadFormacion({
      pageId: 'cur-1',
      tema: 'Product Ownership',
      estado: ESTADOS_FORMACION[1],
      plataforma: 'Educación IT',
      tematica: ['Product ownership', 'Management'],
      inicio: '2026-11-01',
      fin: '2026-11-30',
      seccionOnenote: 'PO Nivel 1',
    })).toEqual({
      ok: true,
      payload: {
        page_id: 'cur-1',
        tema: 'Product Ownership',
        estado: 'En curso',
        plataforma: 'Educación IT',
        tematica: ['Product ownership', 'Management'],
        inicio: '2026-11-01',
        fin: '2026-11-30',
        seccion_onenote: 'PO Nivel 1',
      },
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
        estado: 'En curso',
        categoria: '💼 Carrera & Tech',
        frecuencia_meta: '10 módulos',
        racha_progreso: 50,
        ultima_fecha: '2026-11-24',
        nota: 'Módulo 5 en curso',
      },
    });
  });

  test('completarHabitoHoy suma +1 una sola vez por día y es idempotente', () => {
    const hab = { id: 'h-1', nombre: 'Respiración', racha_progreso: 2, ultima_fecha: '2026-11-20', estado: 'Activo' };
    const r1 = completarHabitoHoy(hab, '2026-11-27');
    expect(r1.changed).toBe(true);
    expect(r1.payload.racha_progreso).toBe(3);
    expect(r1.payload.ultima_fecha).toBe('2026-11-27');
    expect(estaHabitoHechoHoy(r1.actualizado, '2026-11-27')).toBe(true);

    // Segunda vez en el mismo día no tiene acción
    const r2 = completarHabitoHoy(r1.actualizado, '2026-11-27');
    expect(r2.changed).toBe(false);
  });

  test('alternarCongelacionHabitoHoy y calcularMatriz52Semanas registran fechas reales', () => {
    const hab = { id: 'h-2', nombre: 'Agua', racha_progreso: 4, historial_fechas: JSON.stringify({ done: ['2026-11-26'], frozen: [] }) };
    const c1 = alternarCongelacionHabitoHoy(hab, '2026-11-27', true);
    expect(c1.changed).toBe(true);
    expect(estaHabitoCongeladoHoy(c1.actualizado, '2026-11-27')).toBe(true);

    const matriz = calcularMatriz52Semanas([c1.actualizado], '2026-11-27');
    expect(matriz).toHaveLength(52);
    const ultimaSemana = matriz[51];
    expect(ultimaSemana.cumplidos).toBe(1);
    expect(ultimaSemana.congelados).toBe(1);
    expect(ultimaSemana.esCongelada).toBe(true);
  });
});
