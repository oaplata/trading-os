# PTS Scraping

Scraper para [ProTradingSkills](https://protradingskills.com).

## Paso 1: Login

1. Configura las variables de entorno (copia `.env.example` → `.env`):

   ```bash
   cp .env.example .env
   # Edita .env y pon PTS_USER y PTS_PASSWORD
   ```

2. Instala dependencias y ejecuta:

   ```bash
   npm install
   npm run login
   ```

3. Tras el login, se guarda un screenshot en `screenshots/post-login-<timestamp>.png`.
4. **Paso 2:** Navega a Programas Senior (`#actualizaciones`), recorre las páginas de actualizaciones y:
   - Guarda **screenshot** y **HTML** por cada página en `screenshots/` y `html/` (p. ej. `senior-actualizaciones-page-1-<ts>.png`, `.html`).
   - Extrae todos los **reportes de los últimos 3 meses** (por fecha en cada tarjeta).
   - Deja de paginar cuando el reporte más antiguo de la página supera ese margen.
   - Exporta la lista en `data/reportes-ultimos-3-meses-<timestamp>.json` (url, date, title).
5. **Paso 3:** Entra en **cada reporte** de la lista, extrae **fecha** (p. ej. "23 de enero de 2026 a las 16:42") y **contenido** (texto del cuerpo) y guarda un JSON en `data/reportes-fecha-contenido-<timestamp>.json`: un arreglo donde cada ítem es `{ "fecha": "...", "contenido": "..." }`.

### Logs y debug

- Todos los pasos se registran con timestamp y nivel (`INFO`, `WARN`, `ERROR`).
- Si hay un error, se guardan `screenshots/error-<timestamp>.png` y `screenshots/error-<timestamp>.html` para depuración.

### Variables de entorno

| Variable      | Descripción                |
|---------------|----------------------------|
| `PTS_USER`    | Usuario de ProTradingSkills |
| `PTS_PASSWORD`| Contraseña                  |
