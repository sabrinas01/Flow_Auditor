const fs = require('fs');
const path = require('path');

const { escapeHtml } = require('../../src/utils/dashboard_logic');
global.escapeHtml = escapeHtml;

const {
  renderizarAgendaEventos,
  renderizarRecordatoriosVarios,
} = require('../../src/utils/dom_render');

describe('Pantallas Stitch v4.86 — Detalle de Evento, Foco Diario y Vacíos Compasivos', () => {
  test('agenda-personal.html incluye el modal Detalle de Evento Seleccionado y sus acciones', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../agenda-personal.html'), 'utf8');
    expect(html).toContain('id="modal-detalle-evento"');
    expect(html).toContain('function abrirModalDetalleEvento');
    expect(html).toContain('function posponerEvento30Min');
    expect(html).toContain('function completarEventoDesdeDetalle');
    expect(html).toContain('asistente_sabry:agenda_checklist_v1');
  });

  test('inicio.html incluye el bloque Foco & Intención Diaria, ABM con Notion e Historial', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../inicio.html'), 'utf8');
    expect(html).toContain('id="widget-foco-inicio"');
    expect(html).toContain('id="modal-foco-diario"');
    expect(html).toContain('id="modal-historial-foco"');
    expect(html).toContain('function abrirModalFocoDiario');
    expect(html).toContain('function guardarFocoDiarioEnNotion');
    expect(html).toContain('asistente_sabry:foco_diario_v1');
    expect(html).toContain('Meta física');
    expect(html).toContain('Meta mental');
    expect(html).toContain('Meta social/espiritual');
    expect(html).not.toContain('Sincronizado con Notion BD: Salud_Ciclo_Sabry');
    expect(html).not.toContain('/${p(d.getMonth() + 1)}`;');
  });

  test('extract_and_audit.py incluye guardar_foco_diario y sincronizar_foco_diario', () => {
    const py = fs.readFileSync(path.join(__dirname, '../../extract_and_audit.py'), 'utf8');
    expect(py).toContain('NOTION_DB_FOCO_DIARIO');
    expect(py).toContain('def guardar_foco_diario(');
    expect(py).toContain('def sincronizar_foco_diario(');
  });

  test('renderizarAgendaEventos agrega botón de detalle y estado vacío compasivo', () => {
    document.body.innerHTML = `
      <span id="total-eventos-manana-lbl"></span>
      <div id="list-eventos-manana"></div>
    `;
    renderizarAgendaEventos('eventos-manana', []);
    const vacio = document.getElementById('list-eventos-manana').textContent;
    expect(vacio).toContain('Sin eventos registrados');
    expect(vacio).toContain('energía somática');

    renderizarAgendaEventos('eventos-manana', [
      { id: 'ev-1', nombre: 'Revisión semanal', inicio: '2026-11-26T14:00:00', fin: '2026-11-26T15:30:00' },
    ]);
    const btnDetalle = document.querySelector('[title="Ver detalle del evento"]');
    expect(btnDetalle).not.toBeNull();
  });

  test('renderizarRecordatoriosVarios muestra estado vacío compasivo', () => {
    document.body.innerHTML = `
      <span id="total-varios-hoy-lbl"></span>
      <div id="list-varios-hoy"></div>
    `;
    renderizarRecordatoriosVarios('varios-hoy', []);
    const vacio = document.getElementById('list-varios-hoy').textContent;
    expect(vacio).toContain('Sin recordatorios registrados');
    expect(vacio).toContain('sobrecarga visual');
  });
});
