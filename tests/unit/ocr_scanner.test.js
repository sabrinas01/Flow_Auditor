const { construirSolicitudOcrNotion } = require('../../src/utils/ocr_scanner.js');

describe('ocr_scanner', () => {
  test('rechaza texto vacío o sin tipo elegido', () => {
    expect(construirSolicitudOcrNotion('frase', '').ok).toBe(false);
    expect(construirSolicitudOcrNotion('', 'Una frase linda').ok).toBe(false);
  });

  test('arma payload correcto para frase, libro y afirmación', () => {
    expect(construirSolicitudOcrNotion('frase', 'Elegir tu paz', { autor: 'Sabry' })).toEqual({
      ok: true,
      accion: 'crear_frase_relacion',
      datos: { frase: 'Elegir tu paz', autor: 'Sabry' },
    });

    expect(construirSolicitudOcrNotion('libro', 'Párrafo citado', { titulo: 'Hábitos Atómicos', autor: 'James Clear' })).toEqual({
      ok: true,
      accion: 'guardar_cita_libro_ocio',
      datos: { titulo: 'Hábitos Atómicos', autor: 'James Clear', texto: 'Párrafo citado' },
    });

    expect(construirSolicitudOcrNotion('afirmacion', 'Merezco descanso', { categoria: '🛡️ Autorrespeto' })).toEqual({
      ok: true,
      accion: 'crear_afirmacion_relacion',
      datos: { nombre: 'Merezco descanso', categoria: '🛡️ Autorrespeto', contexto: null, integrada: false },
    });
  });
});
