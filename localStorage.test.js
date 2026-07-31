const result = initLocalStorage();

expect(result).toBeTruthy();
expect(result._schema_version).toBe('1.0');
expect(result.uiState.lastViewedTab).toBe('AYER');
// la clave antigua se elimina opcionalmente
expect(localStorage.getItem(oldKey)).toBeNull();
// nueva clave existe
expect(localStorage.getItem('flow_auditor:v1.0')).not.toBeNull();
