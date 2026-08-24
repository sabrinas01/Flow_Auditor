/**
Test de migración: simula clave antigua y comprueba migración a v1.0
Requiere Jest (usa jsdom por defecto, por eso localStorage existe).
NOTA: este repo todavía no tiene Jest instalado (sin package.json de
frontend) — este test documenta el contrato esperado pero no corre en
CI todavía. El path del require ya apunta al archivo real.
*/
const { initLocalStorage } = require('../../src/utils/src_localStorage_index.js');

describe('localStorage migrations', () => {
  beforeEach(() => {
    // limpiar antes de cada test
    localStorage.clear();
  });

  test('migrates 0.9 -> 1.0 when old key present', () => {
    const oldKey = 'flow_auditor:v0.9';
    const oldValue = {
      _schema_version: '0.9',
      uiState: { lastTab: 'AYER' },
      userPrefs: {},
    };
    localStorage.setItem(oldKey, JSON.stringify(oldValue));

    const result = initLocalStorage();

    expect(result).toBeTruthy();
    expect(result._schema_version).toBe('1.0');
    expect(result.uiState.lastViewedTab).toBe('AYER');
    // la clave antigua se elimina opcionalmente
    expect(localStorage.getItem(oldKey)).toBeNull();
    // nueva clave existe
    expect(localStorage.getItem('flow_auditor:v1.0')).not.toBeNull();
  });

  test('initializes when no key exists', () => {
    const result = initLocalStorage();
    expect(result._schema_version).toBe('1.0');
    expect(result.uiState.lastViewedTab).toBe('HOY');
  });
});