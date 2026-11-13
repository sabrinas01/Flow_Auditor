/**
 * Tests de la lógica pura del formulario "Crear tarea" de agenda-personal.html
 * (src/utils/crear_evento.js) — construcción y validación del payload de
 * evento, y de la solicitud de repository_dispatch hacia la API de GitHub.
 */
const {
  combinarFechaHora,
  construirPayloadEvento,
  construirSolicitudDispatch,
} = require('../../src/utils/crear_evento.js');

describe('combinarFechaHora', () => {
  test('sin hora, devuelve la fecha sola (evento de todo el día)', () => {
    expect(combinarFechaHora('2026-11-14', '')).toBe('2026-11-14');
  });

  test('con hora, agrega el offset GMT-3 explícito', () => {
    expect(combinarFechaHora('2026-11-14', '15:30')).toBe('2026-11-14T15:30:00-03:00');
  });
});

describe('construirPayloadEvento', () => {
  test('rechaza sin nombre', () => {
    const resultado = construirPayloadEvento({ fecha: '2026-11-14' });
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/nombre/i);
  });

  test('rechaza sin fecha', () => {
    const resultado = construirPayloadEvento({ nombre: 'Turno con dermatólogo' });
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/fecha/i);
  });

  test('rechaza hora de fin sin hora de inicio', () => {
    const resultado = construirPayloadEvento({
      nombre: 'Turno con dermatólogo',
      fecha: '2026-11-14',
      horaFin: '16:00',
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/hora de inicio/i);
  });

  test('construye el payload mínimo con default de Estado', () => {
    const resultado = construirPayloadEvento({
      nombre: '  Turno con dermatólogo  ',
      fecha: '2026-11-14',
    });
    expect(resultado).toEqual({
      ok: true,
      payload: {
        nombre: 'Turno con dermatólogo',
        fecha_inicio: '2026-11-14',
        fecha_fin: null,
        estado: 'Sin empezar',
        tipo_tarea: null,
        prioridad: null,
        descripcion: null,
      },
    });
  });

  test('construye el payload completo con horas, tipo y prioridad', () => {
    const resultado = construirPayloadEvento({
      nombre: 'Turno con dermatólogo',
      fecha: '2026-11-14',
      horaInicio: '15:30',
      horaFin: '16:30',
      estado: 'Planificada',
      tipoTarea: 'ESTUDIO MÉDICO',
      prioridad: 'Alta',
      descripcion: 'Llevar estudios previos',
    });
    expect(resultado).toEqual({
      ok: true,
      payload: {
        nombre: 'Turno con dermatólogo',
        fecha_inicio: '2026-11-14T15:30:00-03:00',
        fecha_fin: '2026-11-14T16:30:00-03:00',
        estado: 'Planificada',
        tipo_tarea: 'ESTUDIO MÉDICO',
        prioridad: 'Alta',
        descripcion: 'Llevar estudios previos',
      },
    });
  });
});

describe('construirSolicitudDispatch', () => {
  test('arma la URL, el header de autorización y el body con event_type fijo', () => {
    const payload = { nombre: 'Turno', fecha_inicio: '2026-11-14' };
    const { url, options } = construirSolicitudDispatch('sabrinas01', 'Flow_Auditor', payload, 'TOKEN_DE_PRUEBA');

    expect(url).toBe('https://api.github.com/repos/sabrinas01/Flow_Auditor/dispatches');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer TOKEN_DE_PRUEBA');
    expect(JSON.parse(options.body)).toEqual({
      event_type: 'crear_evento_agenda',
      client_payload: payload,
    });
  });
});
