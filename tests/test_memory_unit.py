"""
Test unitario: usa tracemalloc para funciones puras que no requieren red.
Este test NO debe invocar la API de Notion. Cubre funciones locales (ej: evaluar_bloque_temporal).
Requiere solo stdlib (tracemalloc).
"""
import tracemalloc
from extract_and_audit import evaluar_bloque_temporal


def test_evaluar_bloque_temporal_memoria():
    tracemalloc.start()
    # Llamamos repetidamente para simular uso y medir pico
    for _ in range(1000):
        _ = evaluar_bloque_temporal("2026-01-01T00:00:00")
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    # Umbral en bytes (ej: 5 MB)
    assert peak < 5 * 1024 * 1024, f"Pico de memoria inesperado: {peak} bytes"