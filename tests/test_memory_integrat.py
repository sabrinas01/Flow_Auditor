"""
Test de integración: ejecuta el script en un proceso separado y mide RSS máximo.
Requisitos en CI: instalar psutil (pip install psutil).
IMPORTANTE: este test debe correr con variables de entorno que eviten llamadas reales a Notion,
por ejemplo mocks o valores de DB que hagan que el script salga rápido.
"""
import os
import subprocess
import psutil
import time


def test_peak_rss_subprocess():
    # Ejecutable: lanzar el script con variables que eviten red y cumplan validaciones de longitud
    env = os.environ.copy()
    env.update({
        # Claves dummy lo bastante largas para pasar la validación de formato
        "NOTION_API_KEY": "A" * 40,
        "NOTION_DB_RECORDATORIOS_DIARIOS": "B" * 40,
        # Indicamos GITHUB_ACTIONS para el comportamiento de CI si hay ramas condicionadas
        "GITHUB_ACTIONS": "true",
    })

    proc = subprocess.Popen(
        ["python", "extract_and_audit.py"],
        env=env,
    )

    peak_rss = 0
    try:
        p = psutil.Process(proc.pid)
        # Poll y medida simple con timeout
        for _ in range(60):  # max 60 iteraciones * 0.5s = 30s
            if proc.poll() is not None:
                break
            try:
                rss = p.memory_info().rss
                peak_rss = max(peak_rss, rss)
            except psutil.NoSuchProcess:
                break
            time.sleep(0.5)
    finally:
        # Asegurarse de cerrar el proceso si quedó colgado
        if proc.poll() is None:
            proc.kill()
            proc.wait(timeout=5)

    # Umbral ejemplo: 200 MB
    assert peak_rss < 200 * 1024 * 1024, f"Pico RSS demasiado alto: {peak_rss} bytes"