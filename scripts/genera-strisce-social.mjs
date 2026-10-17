/**
 * genera-strisce-social.mjs — la striscia di ogni lezione in una PNG sola, per X.
 *
 *     node scripts/genera-strisce-social.mjs          # tutte le lezioni con 8 vignette v3
 *     node scripts/genera-strisce-social.mjs 001 004  # solo queste
 *
 * X accetta immagini, non SVG: le 8 vignette v3 di `lezioni/strisce/` vanno in una
 * griglia 4×2 e si cuociono in `social/strisce/lezione-NNN.png`. Il rendering e'
 * quello di genera-og-image.mjs (Chrome headless, che sul Mac non esce da solo).
 * Non qlmanage: la sua anteprima taglia ogni vignetta in un quadrato (provato il 17/10).
 *
 * — creato da ECHO, 2026-10-17 (il Direttore: «al testo va aggiunta la vignetta nuova»)
 */
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const QUI = dirname(fileURLToPath(import.meta.url));
const SITO = join(QUI, '..');
const STRISCE = join(SITO, 'lezioni', 'strisce');
const USCITA = join(SITO, 'social', 'strisce');
const VL = 400, VA = 480, SPAZIO = 12;            // la vignetta v3 e' 400×480
const L = VL * 4 + SPAZIO * 5, A = VA * 2 + SPAZIO * 3;

// Il browser: lo stesso giro di genera-og-image.mjs.
const dentro = (dir, coda) => {
  try { return readdirSync(dir).filter(n => n.startsWith('chromium')).sort().reverse().map(n => join(dir, n, coda)); }
  catch { return []; }
};
const BROWSER = [
  process.env.COLLAUDO_BROWSER,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...dentro(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '', 'chrome-linux/chrome'),
  ...dentro('/opt/pw-browsers', 'chrome-linux/chrome'),
  ...dentro(join(process.env.HOME ?? '', '.cache/ms-playwright'), 'chrome-linux/chrome'),
].filter(Boolean).find(existsSync);
if (!BROWSER) { console.error('✗ nessun browser: Chrome, Brave o Chromium'); process.exit(1); }
const FLAG_ROOT = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const vignette = n => Array.from({ length: 8 }, (_, i) => join(STRISCE, `lezione-${n}-vignetta-0${i + 1}-v3.svg`));
const tutte = [...new Set(readdirSync(STRISCE).map(f => f.match(/^lezione-(\d{3})-vignetta-0\d-v3\.svg$/)?.[1]).filter(Boolean))].sort();
const lezioni = (process.argv.slice(2).length ? process.argv.slice(2) : tutte).filter(n => vignette(n).every(existsSync));

const dormi = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(USCITA, { recursive: true });

for (const n of lezioni) {
  const tmp = mkdtempSync(join(tmpdir(), 'striscia-'));
  const html = join(tmp, 'striscia.html');
  writeFileSync(html, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}
    html,body{width:${L}px;height:${A}px;background:#0C0A0C;overflow:hidden}
    .g{display:grid;grid-template-columns:repeat(4,${VL}px);gap:${SPAZIO}px;padding:${SPAZIO}px}
    img{width:${VL}px;height:${VA}px;display:block}
  </style></head><body><div class="g">${vignette(n).map(f => `<img src="${pathToFileURL(f)}">`).join('')}</div></body></html>`);

  const dest = join(USCITA, `lezione-${n}.png`);
  if (existsSync(dest)) unlinkSync(dest);
  const proc = spawn(BROWSER, ['--headless=new', ...FLAG_ROOT, `--screenshot=${dest}`,
    `--window-size=${L},${A}`, '--hide-scrollbars', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--allow-file-access-from-files', '--virtual-time-budget=3000',
    `--user-data-dir=${tmp}/prof`, html], { stdio: 'ignore', detached: false });

  // Chrome scrive il PNG e resta vivo: aspetto il file fermo, poi lo chiudo.
  let peso = -1, fermo = 0, atteso = 0;
  while (atteso < 40000) {
    await dormi(300); atteso += 300;
    if (!existsSync(dest)) continue;
    const ora = statSync(dest).size;
    if (ora > 0 && ora === peso) { if (++fermo >= 2) break; } else fermo = 0;
    peso = ora;
  }
  proc.kill('SIGKILL');
  if (!existsSync(dest) || statSync(dest).size === 0) { console.error(`✗ lezione ${n}: nessuna immagine`); process.exit(1); }
  unlinkSync(html);
  console.log(`✓ social/strisce/lezione-${n}.png — ${L}×${A} · ${statSync(dest).size} byte`);
}
console.log(`${lezioni.length} strisce`);
