/**
 * Tests de la lógica pura del módulo Ocio (src/utils/ocio_logic.js).
 */
const {
  OCIO_SEED,
  calcularResumenOcio,
  filtrarCatalogoOcio,
  construirItemOcio,
  moverTarjetaKanban,
} = require('../../src/utils/ocio_logic.js');

describe('calcularResumenOcio', () => {
  test('calcula métricas de libros, series, películas y horas semanales', () => {
    const res = calcularResumenOcio(OCIO_SEED);
    expect(res.librosLeidos).toBe(1);
    expect(res.librosEnCurso).toBe(2);
    expect(res.seriesEnCurso).toBe(3);
    expect(res.pelisVistas).toBe(3);
    expect(res.pelisPendientes).toBe(1);
    expect(res.totalHoras).toBeGreaterThan(0);
  });
});

describe('filtrarCatalogoOcio', () => {
  test('filtra por título, autor o género sin distinguir mayúsculas', () => {
    expect(filtrarCatalogoOcio(OCIO_SEED.libros, 'clear')).toHaveLength(1);
    expect(filtrarCatalogoOcio(OCIO_SEED.libros, '')).toHaveLength(4);
  });
});

describe('construirItemOcio', () => {
  test('valida campos obligatorios y normaliza puntuación', () => {
    expect(construirItemOcio({ secundario: 'Autor' }).ok).toBe(false);
    expect(construirItemOcio({ titulo: 'Libro' }).ok).toBe(false);
    const res = construirItemOcio({
      titulo: 'Sapiens',
      secundario: 'Yuval Harari',
      genero: 'Historia',
      puntuacion: '4.8',
    });
    expect(res.ok).toBe(true);
    expect(res.item.puntuacion).toBe(4.8);
  });
});

describe('moverTarjetaKanban', () => {
  test('mueve tarjeta entre columnas respetando límites', () => {
    const movida = moverTarjetaKanban(OCIO_SEED.kanban, 'kan-1', 1);
    expect(movida.find((c) => c.id === 'kan-1').col).toBe('finde');
    const limite = moverTarjetaKanban(OCIO_SEED.kanban, 'kan-1', -1);
    expect(limite.find((c) => c.id === 'kan-1').col).toBe('ideas');
  });
});
