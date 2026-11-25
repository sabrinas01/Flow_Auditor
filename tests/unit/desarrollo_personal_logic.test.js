const {
  PILARES_DESARROLLO,
  TIPOS_DESARROLLO,
  ESTADOS_DESARROLLO,
  FORMATOS_RECURSO_VUELO,
  calcularResumenDesarrollo,
  construirPayloadDesarrollo,
  construirRecursoEnVuelo,
  agregarRecursoACatalogo,
  analizarImpactoEliminacionDesarrollo,
  crearSnapshotRollback,
  filtrarSnapshotsVigentes,
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

  test('construirRecursoEnVuelo valida título, URL y formatea etiqueta del catálogo', () => {
    expect(construirRecursoEnVuelo({ titulo: '   ' }).ok).toBe(false);
    expect(construirRecursoEnVuelo({ titulo: 'Ep. 42', url: 'ftp://invalida' }).ok).toBe(false);

    const ok = construirRecursoEnVuelo({
      titulo: 'Neurobiología del Nervio Vago Ep. 42',
      formato: FORMATOS_RECURSO_VUELO[0],
      autor: 'Dr. Stephen Porges',
      url: 'https://podcast.ejemplo.com/ep42',
      tags: 'nervio vago, somática, regulación',
    });
    expect(ok).toEqual({
      ok: true,
      recurso: {
        titulo: 'Neurobiología del Nervio Vago Ep. 42',
        formato: '🎧 Podcast / Audio',
        autor: 'Dr. Stephen Porges',
        url: 'https://podcast.ejemplo.com/ep42',
        tags: ['nervio vago', 'somática', 'regulación'],
        etiquetaCatalogo: 'Neurobiología del Nervio Vago Ep. 42 (Dr. Stephen Porges)',
      },
    });
  });

  test('agregarRecursoACatalogo evita duplicados sin distinguir mayúsculas', () => {
    const inicial = ['Hábitos Atómicos'];
    const conDup = agregarRecursoACatalogo(inicial, 'hábitos atómicos');
    expect(conDup).toEqual(['Hábitos Atómicos']);
    const conNuevo = agregarRecursoACatalogo(inicial, 'El Cuerpo Lleva la Cuenta');
    expect(conNuevo).toEqual(['El Cuerpo Lleva la Cuenta', 'Hábitos Atómicos']);
  });

  test('analizarImpactoEliminacionDesarrollo detecta prácticas vinculadas al mismo recurso', () => {
    const reg = { id: 'dp-1', nombre: 'Respiración', recurso_asociado: 'Nervio Vago Ep. 42' };
    const todos = [
      reg,
      { id: 'dp-2', nombre: 'Anclaje', recurso_asociado: 'nervio vago ep. 42' },
      { id: 'dp-3', nombre: 'Journaling', recurso_asociado: 'Otro libro' },
    ];
    const impacto = analizarImpactoEliminacionDesarrollo(reg, todos);
    expect(impacto.tieneRecurso).toBe(true);
    expect(impacto.recurso).toBe('Nervio Vago Ep. 42');
    expect(impacto.vinculosRelacionados).toHaveLength(1);
    expect(impacto.vinculosRelacionados[0].id).toBe('dp-2');
  });

  test('crearSnapshotRollback y filtrarSnapshotsVigentes respetan el período de gracia de 30 días', () => {
    const ahora = Date.UTC(2026, 10, 24, 12, 0, 0);
    const snap = crearSnapshotRollback({ id: 'dp-1', nombre: 'Práctica X', pilar: '🧭 Autoconocimiento' }, 30, ahora);
    expect(snap.nombre).toBe('Práctica X');
    expect(filtrarSnapshotsVigentes([snap], ahora + 1000)).toHaveLength(1);
    expect(filtrarSnapshotsVigentes([snap], ahora + 31 * 86400000)).toHaveLength(0);
  });
});
