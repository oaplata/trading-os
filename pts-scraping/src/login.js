import 'dotenv/config';
import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOGIN_URL = 'https://protradingskills.com/wp-login.php';
const SENIOR_BASE = 'https://protradingskills.com/plataforma/programas/senior';
const SENIOR_URL = `${SENIOR_BASE}/#actualizaciones`;
const DATA_DIR = join(__dirname, '..', 'data');
/** Carpeta base donde se guarda el HTML de cada reporte: reportes/001_fecha_slug/index.html */
const REPORTES_HTML_BASE = join(DATA_DIR, 'reportes');

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

/** Sin límite de fecha: se extraen todos los reportes. */

/** Genera un slug seguro para nombres de carpeta (sin caracteres raros, longitud limitada). */
function slugify(text, maxLen = 50) {
  if (!text || typeof text !== 'string') return 'sin-titulo';
  const slug = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos (NFD)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, maxLen) || 'sin-titulo';
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

    log('INFO', 'Modo: extraer TODOS los reportes (sin límite de fecha). Procesando por página con hasta 4 pestañas en paralelo.');

    await mkdir(DATA_DIR, { recursive: true });
    await mkdir(REPORTES_HTML_BASE, { recursive: true });

    const GLOBAL_JSON_PATH = join(DATA_DIR, 'reportes-fecha-contenido-todos.json');
    const PROGRESS_PATH = join(DATA_DIR, 'progress.json');

    /** Carga estado previo para reanudar (progress + array de reportes ya guardados). */
    let nextGlobalIndex = 1;
    let reportesConContenido = [];
    try {
      const progressRaw = await readFile(PROGRESS_PATH, 'utf8').catch(() => null);
      if (progressRaw) {
        const progress = JSON.parse(progressRaw);
        nextGlobalIndex = progress.nextGlobalIndex ?? 1;
        log('INFO', 'Progress cargado: reanudando desde índice', nextGlobalIndex);
      }
      const jsonRaw = await readFile(GLOBAL_JSON_PATH, 'utf8').catch(() => null);
      if (jsonRaw) {
        reportesConContenido = JSON.parse(jsonRaw);
        log('INFO', 'JSON global cargado:', reportesConContenido.length, 'reportes ya guardados');
      }
    } catch (e) {
      log('WARN', 'Error leyendo progress/JSON, se empieza desde cero:', e.message);
    }

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

    /** En una pestaña ya abierta: extrae fecha + contenido (para page.evaluate). */
    const extractReportDetail = (p) =>
      p.evaluate(() => {
        const fechaEl = document.querySelector('.avatar-info-component-container .text-info.small-text');
        const contentEl = document.querySelector('article.pts-analysis .entry-content');
        const fecha = fechaEl?.textContent?.trim() ?? '';
        let contenido = contentEl?.innerText?.trim() ?? '';
        contenido = contenido.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        return { fecha, contenido };
      });

    /** Procesa un solo reporte en una pestaña: navega, extrae, guarda HTML + meta, cierra pestaña. Retorna { globalIndex, fecha, contenido }. */
    async function processOneReporte(browser, reporte, globalIndex, totalEstimate) {
      const tab = await browser.newPage();
      try {
        await tab.setViewport({ width: 1280, height: 800 });
        await tab.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        const resp = await tab.goto(reporte.url, { waitUntil: 'networkidle2', timeout: 30000 });
        if (!resp || !resp.ok()) {
          log('ERROR', `Reporte ${globalIndex}: error al cargar`, reporte.url, 'status', resp?.status());
          return { globalIndex, fecha: '', contenido: '' };
        }
        await tab.waitForNetworkIdle({ idleTime: 1500, timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
        let extracted = { fecha: '', contenido: '' };
        try {
          extracted = await extractReportDetail(tab);
        } catch (e) {
          log('WARN', `Reporte ${globalIndex}: error extrayendo contenido:`, e.message);
        }
        const idxStr = String(globalIndex).padStart(3, '0');
        const datePart = reporte.dateParsed || new Date().toISOString().slice(0, 10);
        const slug = slugify(reporte.title || 'reporte');
        const reporteDirName = `${idxStr}_${datePart}_${slug}`;
        const reporteDir = join(REPORTES_HTML_BASE, reporteDirName);
        await mkdir(reporteDir, { recursive: true });
        const html = await tab.content();
        await writeFile(join(reporteDir, 'index.html'), html, 'utf8');
        await writeFile(
          join(reporteDir, 'meta.json'),
          JSON.stringify(
            {
              url: reporte.url,
              title: reporte.title,
              date: reporte.date,
              dateParsed: reporte.dateParsed,
              index: globalIndex,
              total: totalEstimate,
            },
            null,
            2
          ),
          'utf8'
        );
        log('INFO', `  [${globalIndex}] HTML guardado: ${reporteDirName}/index.html`);
        return { globalIndex, fecha: extracted.fecha, contenido: extracted.contenido };
      } finally {
        await tab.close().catch(() => {});
      }
    }

    /** Escribe el JSON global y el progress (para poder reanudar). */
    async function persistGlobalJsonAndProgress(arr, nextIdx, lastPageNum) {
      await writeFile(GLOBAL_JSON_PATH, JSON.stringify(arr, null, 2), 'utf8');
      await writeFile(PROGRESS_PATH, JSON.stringify({ nextGlobalIndex: nextIdx, lastPageNum }, null, 2), 'utf8');
    }

    let pageNum = 1;
    let hasMore = true;

    /** Si reanudamos, ir a la página donde quedamos (la que contiene nextGlobalIndex). */
    if (nextGlobalIndex > 1) {
      const targetPage = Math.ceil(nextGlobalIndex / 4);
      log('INFO', 'Reanudando: navegando a página', targetPage, '...');
      for (let n = 1; n < targetPage; n++) {
        const nextLink = await page.$('a.next.page-numbers');
        if (!nextLink) break;
        const nextHref = await nextLink.evaluate((a) => a.href);
        seniorResponse = await page.goto(nextHref, { waitUntil: 'networkidle2', timeout: 30000 });
        if (!seniorResponse || !seniorResponse.ok()) break;
        await page.waitForNetworkIdle({ idleTime: 2000, timeout: 30000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }
      pageNum = targetPage;
    }

    while (hasMore) {
      const seniorUrlActual = page.url();
      log('INFO', `Página ${pageNum} | URL:`, seniorUrlActual);

      const raw = await extractReportes();
      if (raw.length === 0) {
        log('INFO', 'No hay reportes en esta página, pasando a la siguiente.');
      } else {
        const reportesThisPage = raw.map((r) => {
          const dat = parseReportDate(r.dateStr);
          if (!dat) log('WARN', 'Fecha no parseada:', r.dateStr, '| title:', r.title?.slice(0, 50));
          return {
            url: r.href,
            date: r.dateStr,
            dateParsed: dat ? dat.toISOString().slice(0, 10) : '',
            title: r.title,
          };
        });

        const startOffset = nextGlobalIndex > 1 ? (nextGlobalIndex - 1) % 4 : 0;
        const toProcess = reportesThisPage.slice(startOffset);
        if (toProcess.length === 0) {
          log('INFO', `Página ${pageNum}: todos los reportes de esta página ya procesados (offset ${startOffset}).`);
        } else {
          log('INFO', `Página ${pageNum}: procesando ${toProcess.length} reportes (índices ${nextGlobalIndex} a ${nextGlobalIndex + toProcess.length - 1}) en paralelo...`);
          const results = await Promise.all(
            toProcess.map((r, i) =>
              processOneReporte(browser, r, nextGlobalIndex + i, reportesConContenido.length + toProcess.length)
            )
          );
          results.sort((a, b) => a.globalIndex - b.globalIndex);
          for (const { fecha, contenido } of results) {
            reportesConContenido.push({ fecha, contenido });
          }
          nextGlobalIndex += results.length;
          await persistGlobalJsonAndProgress(reportesConContenido, nextGlobalIndex, pageNum);
        }
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

    log('INFO', 'Total reportes extraídos y guardados:', reportesConContenido.length);
    log('INFO', 'JSON global:', GLOBAL_JSON_PATH);
    log('INFO', 'HTML de todos los reportes en:', REPORTES_HTML_BASE);

    log('INFO', '=== Paso 2 + 3 (paginación + extracción por página en paralelo) finalizado ===');
    log('INFO', '=== Scraper finalizado correctamente ===');
  } catch (err) {
    log('ERROR', 'Excepción:', err.message);
    log('ERROR', 'Stack:', err.stack);
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        if (page) {
          const htmlPath = join(DATA_DIR, `error-${Date.now()}.html`);
          await mkdir(DATA_DIR, { recursive: true });
          const html = await page.content();
          await writeFile(htmlPath, html, 'utf8');
          log('ERROR', 'HTML de error guardado:', htmlPath);
        }
      } catch (e) {
        log('ERROR', 'No se pudo guardar debug HTML:', e.message);
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
