# Configuración y Environment (Local vs CI)
# Propósito

Documentar cómo configurar variables de entorno localmente y en CI, y qué fallbacks soporta el código.
NO subir .env al repositorio. Contiene secretos.


# CI / GitHub Actions
En GitHub: Settings → Secrets and variables → Actions → New repository secret
Añade: NOTION_API_KEY, NOTION_DB_RECORDATORIOS_DIARIOS y NOTION_DB_RECORDATORIOS_VARIOS (dos bases de Notion independientes: la de Recordatorios Diarios y la de Recordatorios Varios)
En tu workflow, mapea secrets a env: env: NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }} NOTION_DB_RECORDATORIOS_DIARIOS: ${{ secrets.NOTION_DB_RECORDATORIOS_DIARIOS }} NOTION_DB_RECORDATORIOS_VARIOS: ${{ secrets.NOTION_DB_RECORDATORIOS_VARIOS }}
Fallbacks soportados
El código acepta varios nombres para la misma información, en orden de preferencia:
NOTION_API_KEY or NOTION_TOKEN
NOTION_DB_RECORDATORIOS_DIARIOS or NOTION_DATABASE_ID or NOTION_DB_ID
NOTION_DB_RECORDATORIOS_VARIOS (sin fallback alternativo; OPCIONAL — a diferencia de las otras dos, su ausencia no hace fallar el script: extract_and_audit.py omite la sincronización de recordatorios-varios.html sin afectar a Recordatorios Diarios)
El helper valida presencia y longitud mínima (configurada en el codebase) y falla con mensajes claros si algo falta. NOTION_DB_RECORDATORIOS_VARIOS es la excepción: se resuelve con required=False.
DRY_RUN para pruebas
Para pruebas locales o CI que no deben ejecutar llamadas externas: exporta/define DRY_RUN=true.
El script principal detecta DRY_RUN y evita llamadas de red.
Comandos útiles
Validar: implementa un script scripts/validate_env.py o usa los tests unitarios agregados.
Ejemplo workflow snippet: jobs: build: runs-on: ubuntu-latest env: NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }} NOTION_DB_RECORDATORIOS_DIARIOS: ${{ secrets.NOTION_DB_RECORDATORIOS_DIARIOS }} NOTION_DB_RECORDATORIOS_VARIOS: ${{ secrets.NOTION_DB_RECORDATORIOS_VARIOS }} steps: - uses: actions/checkout@v4 - run: python extract_and_audit.py
