/**
 * Tests de la lógica pura de Finanzas (src/utils/finanzas_logic.js).
 */
const {
  calcularResumenFinanzas,
  formatearMonedaARS,
  construirPayloadIngreso,
  construirPayloadEgreso,
  calcularProyeccionCuotas,
} = require('../../src/utils/finanzas_logic.js');

describe('calcularResumenFinanzas', () => {
  test('calcula totales y balance correctamente', () => {
    const res = calcularResumenFinanzas(
      [{ monto: 100000 }, { monto: 25000 }],
      [{ monto: 40000 }, { monto: 15000 }],
    );
    expect(res).toEqual({
      totalIngresos: 125000,
      totalEgresos: 55000,
      balance: 70000,
    });
  });

  test('con listas vacías devuelve ceros', () => {
    expect(calcularResumenFinanzas([], [])).toEqual({
      totalIngresos: 0,
      totalEgresos: 0,
      balance: 0,
    });
  });
});

describe('formatearMonedaARS', () => {
  test('formatea un monto numérico como moneda ARS', () => {
    const str = formatearMonedaARS(1234.5);
    expect(str).toContain('1.234,50');
  });
});

describe('construirPayloadIngreso', () => {
  test('rechaza sin título o monto inválido', () => {
    expect(construirPayloadIngreso({ monto: 100, fecha: '2026-11-21' }).ok).toBe(false);
    expect(construirPayloadIngreso({ titulo: 'Sueldo', monto: 0, fecha: '2026-11-21' }).ok).toBe(false);
    expect(construirPayloadIngreso({ titulo: 'Sueldo', monto: 100, fecha: '' }).ok).toBe(false);
  });

  test('construye payload válido con pageId opcional', () => {
    const res = construirPayloadIngreso({
      pageId: 'ing-1',
      titulo: '  Sueldo  ',
      monto: '500000',
      fecha: '2026-11-01',
      tipo: 'SUELDO',
    });
    expect(res).toEqual({
      ok: true,
      payload: {
        page_id: 'ing-1',
        titulo: 'Sueldo',
        monto: 500000,
        fecha: '2026-11-01',
        tipo: 'SUELDO',
      },
    });
  });
});

describe('construirPayloadEgreso', () => {
  test('rechaza sin nombre o monto inválido', () => {
    expect(construirPayloadEgreso({ monto: 100, fecha: '2026-11-21' }).ok).toBe(false);
    expect(construirPayloadEgreso({ nombre: 'Café', monto: -5, fecha: '2026-11-21' }).ok).toBe(false);
  });

  test('construye payload completo de egreso', () => {
    const res = construirPayloadEgreso({
      nombre: 'Supermercado',
      monto: '35000',
      montoUsd: '',
      fecha: '2026-11-21',
      formaPago: 'DÉBITO',
      tarjeta: 'GALICIA',
      cuotas: '1',
      categoria: 'SUPERMERCADO',
      detalle: 'Compra semanal',
    });
    expect(res).toEqual({
      ok: true,
      payload: {
        nombre: 'Supermercado',
        monto: 35000,
        monto_usd: null,
        fecha: '2026-11-21',
        forma_pago: ['DÉBITO'],
        tarjeta: 'GALICIA',
        cuotas: 1,
        categoria: ['SUPERMERCADO'],
        detalle: 'Compra semanal',
        fecha_corte: null,
      },
    });
  });
});

describe('calcularProyeccionCuotas', () => {
  test('agrupa cuotas de tarjeta en los próximos 6 meses desde mesBase', () => {
    const cuotas = [
      { fecha_corte: '2026-11-30', monto: 30000 },
      { fecha_corte: '2026-11-28', monto: 15000 },
      { fecha_corte: '2026-12-30', monto: 30000 },
      { fecha_corte: '2027-02-15', monto: 20000 },
    ];
    const proy = calcularProyeccionCuotas(cuotas, '2026-11', 6);
    expect(proy).toHaveLength(6);
    expect(proy[0]).toEqual({ mes: '2026-11', total: 45000, cantidad: 2 });
    expect(proy[1]).toEqual({ mes: '2026-12', total: 30000, cantidad: 1 });
    expect(proy[2]).toEqual({ mes: '2027-01', total: 0, cantidad: 0 });
    expect(proy[3]).toEqual({ mes: '2027-02', total: 20000, cantidad: 1 });
  });
});
