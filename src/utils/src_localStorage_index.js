// Uso: llamar initLocalStorage() al arrancar la SPA antes de usar datos del storage.
const ROOT_KEY_PREFIX = 'flow_auditor:v';
const CURRENT_SCHEMA = '1.0';
const ROOT_KEY = `${ROOT_KEY_PREFIX}${CURRENT_SCHEMA}`;

function readRaw(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function writeRaw(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function findExistingRootKey() {
  // detectar keys antiguas con prefijo flow_auditor:v*
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(ROOT_KEY_PREFIX)) return k;
  }
  return null;
}

function migrate(fromVersion, data) {
  // Migrations map: implementa los pasos concretos entre versiones
  // Ejemplo trivial: v0.9 -> v1.0
  if (fromVersion === '0.9' && CURRENT_SCHEMA === '1.0') {
    // ejemplo: renombrar lastTab -> lastViewedTab
    if (data.uiState && data.uiState.lastTab) {
      data.uiState.lastViewedTab = data.uiState.lastTab;
      delete data.uiState.lastTab;
    }
    data._schema_version = '1.0';
  }
  // Añadir más migraciones según sea necesario
  return data;
}

export function initLocalStorage() {
  const existingKey = findExistingRootKey();
  if (!existingKey) {
    // crear estructura inicial
    const initial = {
      _schema_version: CURRENT_SCHEMA,
      userPrefs: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Cordoba', showCompleted: true },
      uiState: { lastViewedTab: 'HOY', searchQuery: '' },
      cache: { conteo: { ayer: {}, hoy: {}, manana: {} }, lastSyncedAt: null }
    };
    writeRaw(ROOT_KEY, initial);
    return initial;
  }

  if (existingKey === ROOT_KEY) {
    // ya actualizado
    return readRaw(ROOT_KEY);
  }

  // existe una versión anterior: migrar
  const old = readRaw(existingKey);
  const fromVersion = (old && old._schema_version) ? old._schema_version : '0.9';
  const migrated = migrate(fromVersion, old || {});
  writeRaw(ROOT_KEY, migrated);
  // opcional: quitar la clave antigua
  try { localStorage.removeItem(existingKey); } catch(e) {}
  return migrated;
}