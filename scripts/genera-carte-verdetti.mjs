/**
 * genera-carte-verdetti.mjs — una carta 1200×630 per ogni verdetto pubblicato.
 *
 *     node scripts/genera-carte-verdetti.mjs
 *
 * E' l'immagine che si vede quando qualcuno incolla il link di UN verdetto: il
 * punteggio, le dieci tacche, l'etichetta e il titolo, come nella «lettura veloce»
 * in testa alla pagina. Il contenuto e' quello della sorgente JSON di BRAINDANCE,
 * parola per parola: qui si impagina, non si riscrive. Le carte vanno in
 * `verdetti/carte/<id>.png`; `tipo_verdetto.py` le mette come og:image della
 * pagina SOLO se il file c'e', altrimenti resta l'og-image.png del sito.
 *
 * Si disegna in HTML e si cuoce col browser del Mac, come genera-og-image.mjs
 * (resvg-js e' rotto su questo Mac dal 05/09; Chrome con --screenshot non esce mai e
 * si aspetta il file). Pubblica le stesse sorgenti che pubblica il generatore:
 * riletto_da + riletto_il e impronta che combacia (in_attesa di tipo_verdetto.py).
 * Si lancia DOPO porta-verdetti e PRIMA di genera-tutto.py, cosi' le pagine
 * trovano le carte.
 *
 * — creato da KIROSHI, 2026-10-19 (passo 3 del piano .ninja)
 */
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, statSync, readdirSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const QUI = dirname(fileURLToPath(import.meta.url));
const SITO = join(QUI, '..');
const SORGENTI = join(SITO, 'verdetti', '_sorgenti');
const USCITA = join(SITO, 'verdetti', 'carte');
const L = 1200, A = 630;
const TETTO = 150_000;   // byte per carta: oltre, e' rossa (traguardo del piano)

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
if (!BROWSER) { console.error('✗ nessun browser: Chrome, Brave o Chromium in /Applications o /usr/bin, la cache di Playwright, o COLLAUDO_BROWSER=/percorso'); process.exit(1); }
const FLAG_ROOT = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const V = '#5C7CFF', FONDO = '#0C0A0C', SUP = '#161216', CARTA = '#EFE6EB', MUTO = '#A89DA4', LINEA = '#3B2E36';

const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// La stessa regola di tipo_verdetto.in_attesa: si pubblica solo cio' che e' riletto
// per questa casa, sull'impronta corrente.
const inAttesa = d => {
  const n = d._ninja ?? {};
  if (!(n.riletto_da && n.riletto_il)) return 'non ancora riletto';
  if (n.riletto_impronta !== n.impronta) return 'riletto su una versione precedente';
  return null;
};

// Le dieci tacche: la stessa soglia di tipo_verdetto.tacche (i*10 < punteggio).
const tacche = p => Array.from({ length: 10 }, (_, i) => `<i class="${i * 10 < p ? 'on' : ''}"></i>`).join('');

// Il titolo: piu' e' lungo, piu' e' piccolo. Mai tagliato: si rimpicciolisce.
const corpoTitolo = t => t.length <= 30 ? 66 : t.length <= 60 ? 54 : t.length <= 80 ? 46 : 40;

const lente = readFileSync(join(SITO, 'braindance', 'lente.svg'), 'utf8')
  .replace(/width="\d+" height="\d+"/, 'width="300" height="300"');

const pagina = d => `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${L}px;height:${A}px;background:${FONDO};overflow:hidden}
  .t{ width:${L}px; height:${A}px; padding:54px 64px 48px; position:relative; display:flex; gap:48px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:${CARTA}; }
  .barra{ position:absolute; top:0; left:0; right:0; height:6px; background:${V}; }
  .sx{ flex:1; min-width:0; display:flex; flex-direction:column; }
  .mono{ font-family:'Courier Prime','Courier New',monospace; }
  .occhiello{ font-size:20px; letter-spacing:.32em; color:${MUTO}; text-transform:uppercase; }
  .referto{ margin-top:26px; display:flex; align-items:baseline; gap:22px; }
  .punteggio{ font-weight:700; font-size:118px; line-height:.9; color:${V}; letter-spacing:-.02em; }
  .punteggio small{ font-size:34px; color:${MUTO}; font-weight:400; letter-spacing:0; }
  .tacche{ display:flex; gap:7px; }
  .tacche i{ display:block; width:22px; height:22px; border:2px solid ${V}; background:transparent; }
  .tacche i.on{ background:${V}; }
  .etichetta{ margin-top:22px; font-family:Georgia,'Iowan Old Style',serif; font-style:italic; font-size:27px; line-height:1.25; color:${CARTA}; }
  .titolo{ margin-top:30px; font-weight:700; line-height:1.12; letter-spacing:-.01em; }
  .piede{ margin-top:auto; padding-top:16px; border-top:1px solid ${LINEA}; font-size:19px; color:${MUTO}; letter-spacing:.04em; white-space:nowrap; }
  .piede b{ color:${CARTA}; font-weight:400; }
  .dx{ width:300px; flex:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; }
  .dx svg{ width:300px; height:300px; display:block; }
  .dx .chi{ font-size:18px; letter-spacing:.3em; color:${MUTO}; text-transform:uppercase; text-align:center; }
</style></head><body>
  <div class="t">
    <div class="barra"></div>
    <div class="sx">
      <div class="occhiello mono">Verdetto · n. ${e(d.id.slice(0, 4))} · ${e(d.data)}</div>
      <div class="referto">
        <span class="punteggio mono">${e(d.punteggio)}<small>/100</small></span>
        <span class="tacche">${tacche(d.punteggio)}</span>
      </div>
      <div class="etichetta">${e(d.etichetta)}</div>
      <div class="titolo" style="font-size:${corpoTitolo(d.titolo)}px">${e(d.titolo)}</div>
      <div class="piede mono"><b>cyberboomer.ninja</b> · Con la fonte, sempre. · Diritto di replica.</div>
    </div>
    <div class="dx">
      ${lente}
      <div class="chi mono">Braindance</div>
    </div>
  </div>
</body></html>`;

const dormi = ms => new Promise(r => setTimeout(r, ms));

// Chrome con --screenshot scrive il PNG e resta vivo: si aspetta il file, poi si chiude.
async function cuoci(html, dest, prof) {
  if (existsSync(dest)) unlinkSync(dest);
  const proc = spawn(BROWSER, ['--headless=new', ...FLAG_ROOT, `--screenshot=${dest}`,
    `--window-size=${L},${A}`, '--hide-scrollbars', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--virtual-time-budget=2000',
    `--user-data-dir=${prof}`, html], { stdio: 'ignore', detached: false });
  let peso = -1, fermo = 0, atteso = 0;
  while (atteso < 40000) {
    await dormi(250); atteso += 250;
    if (!existsSync(dest)) continue;
    const ora = statSync(dest).size;
    if (ora > 0 && ora === peso) { if (++fermo >= 2) break; } else fermo = 0;
    peso = ora;
  }
  proc.kill('SIGKILL');
  return existsSync(dest) ? statSync(dest).size : 0;
}

const sorgenti = readdirSync(SORGENTI).filter(n => n.endsWith('.json')).sort();
if (!sorgenti.length) { console.error(`✗ nessuna sorgente in verdetti/_sorgenti/`); process.exit(1); }

const tmp = mkdtempSync(join(tmpdir(), 'carte-'));
mkdirSync(USCITA, { recursive: true });
let fatte = 0, rosse = 0, attesa = 0;
for (const nome of sorgenti) {
  const d = JSON.parse(readFileSync(join(SORGENTI, nome), 'utf8'));
  const motivo = inAttesa(d);
  if (motivo) { attesa++; console.log(`  ⏸ ${nome}: ${motivo}`); continue; }
  const html = join(tmp, `${d.id}.html`);
  writeFileSync(html, pagina(d));
  const dest = join(USCITA, `${d.id}.png`);
  const peso = await cuoci(html, dest, join(tmp, 'prof'));
  unlinkSync(html);
  if (!peso) { rosse++; console.error(`✗ ${d.id}: il browser non ha prodotto la carta`); continue; }
  const sopra = peso > TETTO;
  if (sopra) rosse++; else fatte++;
  console.log(`  ${sopra ? '✗' : '✓'} carte/${d.id}.png — ${peso} byte${sopra ? ` (sopra i ${TETTO})` : ''}`);
}
rmSync(tmp, { recursive: true, force: true });

// Una carta di un verdetto che non c'e' piu' non resta in giro.
const vive = new Set(sorgenti.map(n => n.replace(/\.json$/, '.png')));
for (const n of readdirSync(USCITA)) {
  if (n.endsWith('.png') && !vive.has(n)) { unlinkSync(join(USCITA, n)); console.log(`  – tolta carte/${n}: verdetto non piu' in sorgenti`); }
}

console.log(`${rosse ? '✗' : '✓'} ${fatte} carte ${L}×${A} in verdetti/carte/` + (attesa ? ` · ${attesa} in attesa` : '') + (rosse ? ` · ${rosse} rosse` : '') + ` (reso con ${BROWSER.split('/').pop()})`);
process.exit(rosse ? 1 : 0);
