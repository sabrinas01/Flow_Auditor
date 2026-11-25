const {
  MODULOS_NAVEGACION,
  PREFS_DEFAULT,
  NOTIFS_DEFAULT,
} = require('../../src/utils/somatic_shell.js');

describe('somatic_shell', () => {
  test('expone los 11 módulos canónicos + Contras AI Studio en Command Palette', () => {
    expect(MODULOS_NAVEGACION).toHaveLength(12);
    const hrefs = MODULOS_NAVEGACION.map((m) => m.href);
    expect(hrefs).toContain('inicio.html');
    expect(hrefs).toContain('salud.html');
    expect(hrefs).toContain('gestion-emocional.html');
    expect(hrefs).toContain('https://contras.ai.studio/');
  });

  test('define preferencias somáticas anti-ansiedad por defecto', () => {
    expect(PREFS_DEFAULT.ceroCulpa).toBe(true);
    expect(PREFS_DEFAULT.blindajeNocturno).toBe(true);
    expect(PREFS_DEFAULT.proteccionLutea).toBe(true);
    expect(PREFS_DEFAULT.focoProfundo).toBe(false);
  });

  test('incluye notificaciones somáticas iniciales clasificadas por categoría', () => {
    const cats = NOTIFS_DEFAULT.map((n) => n.cat);
    expect(cats).toContain('Biológicas');
    expect(cats).toContain('Notion Sync');
    expect(cats).toContain('Hábitos');
  });
});
