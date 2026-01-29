import 'dotenv/config';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOGIN_URL = 'https://protradingskills.com/wp-login.php';
const SENIOR_BASE = 'https://protradingskills.com/plataforma/programas/senior';
const SENIOR_URL = `${SENIOR_BASE}/#actualizaciones`;
const SCREENSHOT_DIR = join(__dirname, '..', 'screenshots');
const HTML_DIR = join(__dirname, '..', 'html');
const DATA_DIR = join(__dirname, '..', 'data');

/** Parsea "DD/MM/YYYY a las HH:MM" o "DD/MM/YYYY" → Date. Retorna null si falla. */
function parseReportDate(str) {
  if (!str || typeof str !== 'string') return null;
  const part = str.trim().split(/\s/)[0];
  const m = part.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const date = new Date(y, mo, d);
  return isNaN(date.getTime()) ? null : date;
}

/** Fecha de hace 3 meses desde hoy (misma hora). */
function threeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
}

function log(level, message, ...args) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level}]`;
  const fn = level === 'ERROR' ? console.error : console.log;
  fn(prefix, message, ...args);
}

async function main() {
  log('INFO', '=== Iniciando scraper PTS - Paso 1: Login ===');

  const user = process.env.PTS_USER;
  const password = process.env.PTS_PASSWORD;

  if (!user || !password) {
    log('ERROR', 'Faltan variables de entorno PTS_USER y/o PTS_PASSWORD');
    log('ERROR', 'PTS_USER presente:', !!user, '| PTS_PASSWORD presente:', !!password);
    process.exit(1);
  }
  log('INFO', 'Variables de entorno cargadas (usuario:', user, ')');

  let browser;
  try {
    log('INFO', 'Lanzando navegador...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    log('INFO', 'Navegador lanzado');

    const page = await browser.newPage();

    log('INFO', 'Configurando viewport y user-agent...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    log('INFO', 'Navegando a', LOGIN_URL, '...');
    const navResponse = await page.goto(LOGIN_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    if (!navResponse || !navResponse.ok()) {
      log('ERROR', 'Error al cargar login: status', navResponse?.status());
      throw new Error('Fallo al cargar página de login');
    }
    log('INFO', 'Página de login cargada, status:', navResponse.status());

    log('INFO', 'Buscando campos del formulario...');
    const userSelector = '#user_login, input[name="log"]';
    const passSelector = '#user_pass, input[name="pwd"]';
    const submitSelector = '#wp-submit, input[name="wp-submit"]';

    const userEl = await page.$(userSelector);
    const passEl = await page.$(passSelector);
    const submitEl = await page.$(submitSelector);

    if (!userEl) {
      log('ERROR', 'No se encontró campo usuario. Selector usado:', userSelector);
      throw new Error('Campo usuario no encontrado');
    }
    if (!passEl) {
      log('ERROR', 'No se encontró campo contraseña. Selector usado:', passSelector);
      throw new Error('Campo contraseña no encontrado');
    }
    if (!submitEl) {
      log('ERROR', 'No se encontró botón enviar. Selector usado:', submitSelector);
      throw new Error('Botón enviar no encontrado');
    }
    log('INFO', 'Formulario encontrado (usuario, contraseña, enviar)');

    log('INFO', 'Rellenando credenciales...');
    await userEl.type(user, { delay: 50 });
    await passEl.type(password, { delay: 50 });
    log('INFO', 'Credenciales rellenadas');

    log('INFO', 'Enviando formulario...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch((e) => {
        log('WARN', 'waitForNavigation timeout o error (puede ser normal):', e.message);
      }),
      submitEl.click(),
    ]);
    log('INFO', 'Formulario enviado');

    log('INFO', 'Esperando carga completa de la página...');
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 }).catch(() => {
      log('WARN', 'waitForNetworkIdle terminó por timeout, continuando...');
    });
    await new Promise((r) => setTimeout(r, 2000));
    log('INFO', 'Página estabilizada');

    const currentUrl = page.url();
    log('INFO', 'URL actual después del login:', currentUrl);

    const pageTitle = await page.title().catch(() => '(no title)');
    log('INFO', 'Título de la página después del login:', pageTitle);

    const stillOnLogin = currentUrl.includes('wp-login.php') && !currentUrl.includes('action=logout');
    if (stillOnLogin) {
      log('WARN', 'Seguimos en wp-login.php – posible login fallido (credenciales o captcha)');
      const errText = await page.$eval('body', (el) => el.innerText).catch(() => '');
      log('INFO', 'Texto visible en body (primeros 800 chars):', errText.slice(0, 800));
      if (errText.includes('incorrect') || errText.toLowerCase().includes('error')) {
        log('ERROR', 'Fragmento de página (posible mensaje de error):', errText.slice(0, 500));
      }
    } else {
      log('INFO', 'Login aparentemente correcto (redirección fuera de wp-login)');
    }

    log('INFO', 'Guardando screenshot en', SCREENSHOT_DIR, '...');
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = join(SCREENSHOT_DIR, `post-login-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log('INFO', 'Screenshot guardado:', screenshotPath);

    log('INFO', '=== Paso 2: Navegando a programas senior (#actualizaciones) ===');
    log('INFO', 'Navegando a', SENIOR_URL, '...');
    let seniorResponse = await page.goto(SENIOR_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    if (!seniorResponse || !seniorResponse.ok()) {
      log('ERROR', 'Error al cargar programas senior: status', seniorResponse?.status());
      throw new Error('Fallo al cargar página de programas senior');
    }
    log('INFO', 'Página de programas senior cargada, status:', seniorResponse.status());

    log('INFO', 'Esperando carga completa (hash #actualizaciones)...');
    await page.waitForNetworkIdle({ idleTime: 2000, timeout: 30000 }).catch(() => {
      log('WARN', 'waitForNetworkIdle terminó por timeout, continuando...');
    });
    log('INFO', 'Esperando tiempo adicional para carga de contenido dinámico...');
    await new Promise((r) => setTimeout(r, 7000));
    log('INFO', 'Página estabilizada');

    const cutoff = threeMonthsAgo();
    log('INFO', 'Reportes desde (>=):', cutoff.toISOString().slice(0, 10), '(últimos 3 meses)');

    await mkdir(HTML_DIR, { recursive: true });
    await mkdir(DATA_DIR, { recursive: true });

    /** Extrae reportes de la página actual (actualizaciones). */
    const extractReportes = async () =>
      page.evaluate(() => {
        const cards = document.querySelectorAll('.expert-analysis-card-container');
        return Array.from(cards).map((card) => {
          const linkEl = card.querySelector('a[href*="/analysis/"]');
          const dateEl = card.querySelector('.text-info.small-text');
          const titleEl = card.querySelector('.analysis-content-title');
          return {
            href: linkEl?.href?.trim() || '',
            dateStr: dateEl?.textContent?.trim() || '',
            title: titleEl?.textContent?.trim() || '',
          };
        });
      });

    const allReportes = [];
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const seniorUrlActual = page.url();
      const seniorTitle = await page.title().catch(() => '(no title)');
      log('INFO', `Página ${pageNum} | URL:`, seniorUrlActual, '| Título:', seniorTitle);

      const raw = await extractReportes();
      log('INFO', `Extraídos ${raw.length} reportes en página ${pageNum}`);

      let oldestOnPage = null;
      let addedThisPage = 0;
      for (const r of raw) {
        const dat = parseReportDate(r.dateStr);
        if (dat) {
          if (dat >= cutoff) {
            allReportes.push({
              url: r.href,
              date: r.dateStr,
              dateParsed: dat.toISOString().slice(0, 10),
              title: r.title,
            });
            addedThisPage += 1;
          }
          if (!oldestOnPage || dat < oldestOnPage) oldestOnPage = dat;
        } else {
          log('WARN', 'Fecha no parseada:', r.dateStr, '| title:', r.title?.slice(0, 50));
        }
      }
      log('INFO', `Página ${pageNum}: ${addedThisPage} reportes dentro de 3 meses (acumulado: ${allReportes.length})`);

      const ts = Date.now();
      const base = `senior-actualizaciones-page-${pageNum}-${ts}`;
      const seniorScreenshotPath = join(SCREENSHOT_DIR, `${base}.png`);
      log('INFO', 'Guardando screenshot...', seniorScreenshotPath);
      await page.screenshot({ path: seniorScreenshotPath, fullPage: true });
      const seniorHtmlPath = join(HTML_DIR, `${base}.html`);
      log('INFO', 'Capturando HTML...', seniorHtmlPath);
      const html = await page.content();
      await writeFile(seniorHtmlPath, html, 'utf8');

      if (oldestOnPage && oldestOnPage < cutoff) {
        log('INFO', 'El reporte más antiguo de esta página ya supera 3 meses. Dejamos de paginar.');
        hasMore = false;
        break;
      }

      const nextLink = await page.$('a.next.page-numbers');
      if (!nextLink) {
        log('INFO', 'No hay enlace "Siguiente". Fin de paginación.');
        hasMore = false;
        break;
      }

      const nextHref = await nextLink.evaluate((a) => a.href);
      log('INFO', 'Navegando a siguiente página:', nextHref);
      seniorResponse = await page.goto(nextHref, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      if (!seniorResponse || !seniorResponse.ok()) {
        log('ERROR', 'Error al cargar siguiente página: status', seniorResponse?.status());
        break;
      }
      log('INFO', 'Esperando carga completa...');
      await page.waitForNetworkIdle({ idleTime: 2000, timeout: 30000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 7000));
      pageNum += 1;
    }

    log('INFO', 'Total reportes (últimos 3 meses):', allReportes.length);
    const listPath = join(DATA_DIR, `reportes-ultimos-3-meses-${Date.now()}.json`);
    await writeFile(listPath, JSON.stringify(allReportes, null, 2), 'utf8');
    log('INFO', 'Lista de reportes guardada:', listPath);

    log('INFO', '=== Paso 3: Entrando en cada reporte y extrayendo fecha + contenido ===');

    const extractReportDetail = () =>
      page.evaluate(() => {
        const fechaEl = document.querySelector('.avatar-info-component-container .text-info.small-text');
        const contentEl = document.querySelector('article.pts-analysis .entry-content');
        const fecha = fechaEl?.textContent?.trim() ?? '';
        let contenido = contentEl?.innerText?.trim() ?? '';
        contenido = contenido.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        return { fecha, contenido };
      });

    const reportesConContenido = [];
    for (let i = 0; i < allReportes.length; i++) {
      const r = allReportes[i];
      log('INFO', `Reporte ${i + 1}/${allReportes.length}:`, r.url, '|', r.title?.slice(0, 50));
      const resp = await page.goto(r.url, { waitUntil: 'networkidle2', timeout: 30000 });
      if (!resp || !resp.ok()) {
        log('ERROR', 'Error al cargar reporte:', r.url, 'status', resp?.status());
        reportesConContenido.push({ fecha: '', contenido: '' });
        continue;
      }
      await page.waitForNetworkIdle({ idleTime: 1500, timeout: 15000 }).catch(() => {});
      await new Promise((res) => setTimeout(res, 2000));
      let extracted = { fecha: '', contenido: '' };
      try {
        extracted = await extractReportDetail();
      } catch (e) {
        log('WARN', 'Error extrayendo fecha/contenido:', e.message);
      }
      reportesConContenido.push({
        fecha: extracted.fecha,
        contenido: extracted.contenido,
      });
    }

    const outputPath = join(DATA_DIR, `reportes-fecha-contenido-${Date.now()}.json`);
    await writeFile(outputPath, JSON.stringify(reportesConContenido, null, 2), 'utf8');
    log('INFO', 'JSON final guardado:', outputPath, '(', reportesConContenido.length, 'reportes)');

    log('INFO', '=== Paso 2 (programas senior + paginación) finalizado ===');
    log('INFO', '=== Paso 3 (extracción fecha + contenido) finalizado ===');
    log('INFO', '=== Scraper finalizado correctamente ===');
  } catch (err) {
    log('ERROR', 'Excepción:', err.message);
    log('ERROR', 'Stack:', err.stack);
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        if (page) {
          const dumpPath = join(SCREENSHOT_DIR, `error-${Date.now()}.png`);
          await mkdir(SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({ path: dumpPath, fullPage: true });
          log('ERROR', 'Screenshot de error guardado:', dumpPath);
          const htmlPath = join(SCREENSHOT_DIR, `error-${Date.now()}.html`);
          const html = await page.content();
          await writeFile(htmlPath, html, 'utf8');
          log('ERROR', 'HTML de error guardado:', htmlPath);
        }
      } catch (e) {
        log('ERROR', 'No se pudo guardar debug (screenshot/html):', e.message);
      }
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      log('INFO', 'Navegador cerrado');
    }
  }
}

main();
