/**
 * genera-og-image.mjs — l'immagine che si vede quando qualcuno incolla il link.
 *
 *     node scripts/genera-og-image.mjs
 *
 * E' la faccia del sito FUORI dal sito: in chat, in un messaggio, in un'anteprima.
 * Si disegna qui in SVG e si cuoce in PNG, cosi' cambiarla e' cambiare tre righe
 * invece di riaprire un programma di grafica.
 *
 * IL RENDERING USA IL BROWSER CHE E' GIA' SUL MAC, e non e' una scorciatoia:
 * la catena precedente della bottega (resvg-js, 15/07) e' ROTTA — la cartella del
 * binario per questo Mac, `@resvg/resvg-js-darwin-arm64`, e' vuota: 0 file.
 * Verificato il 05/09/2026. Chrome headless non chiede installazioni, disegna i
 * font di sistema meglio, e c'e' comunque perche' lo usa gia' il guardiano.
 * Dall'08/09 lo cerca dove lo cerca il guardiano: anche su Linux e nella cache
 * di Playwright, cosi' da una sessione remota o dal runner non si ferma alla
 * prima riga. I font pero' sono quelli della macchina che rende: l'immagine
 * buona resta quella cotta dal Mac.
 *
 * — creato da FLUX, 2026-09-05
 * — il ninja col cartello al posto del solo testo: JUDY, 2026-10-16 (la prima schermata nuova del 16/10)
 */
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const QUI = dirname(fileURLToPath(import.meta.url));
const SITO = join(QUI, '..');
const L = 1200, A = 630;

// Dove si cerca il browser: lo stesso giro del guardiano (strumenti/collaudo.mjs).
// Fino all'08/09 solo in /Applications: su Linux e in CI si fermava alla prima riga.
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
// Come root (contenitori, CI) Chromium non parte senza --no-sandbox: e' la condizione
// per rendere qualcosa in quelle stanze, non una scelta di sicurezza nostra.
const FLAG_ROOT = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const V = '#5C7CFF', FONDO = '#0C0A0C', CARTA = '#EFE6EB', MUTO = '#A89DA4', LINEA = '#3B2E36';

const pagina = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${L}px;height:${A}px;background:${FONDO};overflow:hidden}
  .t{ width:${L}px; height:${A}px; padding:64px 72px; position:relative; display:flex; align-items:center; gap:48px;
      font-family:'Courier Prime','Courier New',monospace; color:${CARTA}; }
  .barra{ position:absolute; top:0; left:0; right:0; height:6px; background:${V}; }
  .sx{ flex:1; }
  .occhiello{ font-size:22px; letter-spacing:.34em; color:${MUTO}; text-transform:uppercase; }
  .nome{ margin-top:34px; font-size:76px; font-weight:700; letter-spacing:.02em; line-height:1; }
  .nome .p{ color:${V}; }
  .motto{ margin-top:34px; font-size:48px; font-family:Georgia,'Iowan Old Style',serif; font-style:italic; line-height:1.1; }
  .claim{ margin-top:22px; font-size:26px; color:${MUTO}; font-family:Georgia,'Iowan Old Style',serif; }
  .piede{ margin-top:40px; font-size:20px; color:${MUTO}; letter-spacing:.08em; }
  .piede b{ color:${CARTA}; font-weight:400; }
  .dx{ width:360px; flex:none; }
  .dx svg{ width:360px; height:auto; display:block; }
  .mono{ font-family:'Courier Prime','Courier New',monospace; font-weight:700; }
</style></head><body>
  <div class="t">
    <div class="barra"></div>
    <div class="sx">
      <div class="occhiello">La voce · divulgazione dal 2077</div>
      <div class="nome">CYBER BOOMER<span class="p">.ninja</span></div>
      <div class="motto">Questo non è gratis.</div>
      <div class="claim">Trappole digitali vere, smontate ridendo.</div>
      <div class="piede"><b>Con la fonte, sempre.</b> · Gratis · senza account · senza cookie · SYSTEMA 77</div>
    </div>
    <div class="dx">
      <!-- il ninja col cartello: lo stesso della prima schermata (JUDY, 16/10), fermo -->
      <svg viewBox="0 0 260 400">
        <defs><radialGradient id="alone" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="${V}" stop-opacity=".30"/><stop offset="1" stop-color="${V}" stop-opacity="0"/></radialGradient></defs>
        <ellipse cx="130" cy="250" rx="150" ry="150" fill="url(#alone)"/>
        <ellipse cx="130" cy="386" rx="62" ry="9" fill="${V}" opacity=".28"/>
        <g fill="#34343E" stroke="#C9BEC5" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
          <rect x="96" y="318" width="28" height="40" rx="12"/><rect x="97" y="348" width="26" height="32" rx="10"/><rect x="86" y="368" width="40" height="14" rx="7"/>
          <rect x="136" y="318" width="28" height="40" rx="12"/><rect x="137" y="348" width="26" height="32" rx="10"/><rect x="134" y="368" width="40" height="14" rx="7"/>
          <rect x="84" y="226" width="92" height="100" rx="22"/>
          <rect x="84" y="296" width="92" height="16" fill="${V}" stroke="none"/>
          <rect x="92" y="236" width="14" height="40" rx="7" fill="#50505C" stroke="none"/>
          <rect x="70" y="118" width="22" height="112" rx="11"/><rect x="168" y="118" width="22" height="112" rx="11"/>
          <circle cx="81" cy="116" r="14"/><circle cx="179" cy="116" r="14"/>
          <rect x="12" y="10" width="236" height="110" rx="4" fill="${CARTA}" stroke="${FONDO}" stroke-width="4"/>
          <g stroke="none" class="mono"><text x="130" y="66" font-size="44" text-anchor="middle" fill="${FONDO}">€ 0,00</text><path d="M62 60 L198 44" stroke="${V}" stroke-width="6" stroke-linecap="round"/><text x="130" y="92" font-size="13.5" text-anchor="middle" fill="${FONDO}">Se è gratis, paghi</text><text x="130" y="109" font-size="13.5" text-anchor="middle" fill="${FONDO}">coi tuoi dati.</text></g>
          <rect x="88" y="146" width="84" height="84" rx="26"/>
          <rect x="84" y="176" width="92" height="26" rx="6" fill="${V}" stroke="none"/>
          <path d="M172 184 l34 -12 -8 18 10 16 -36 -8z" fill="${V}" stroke="none"/>
          <rect x="100" y="181" width="22" height="16" rx="5" fill="#FFFFFF" stroke="none"/><rect x="138" y="181" width="22" height="16" rx="5" fill="#FFFFFF" stroke="none"/>
          <g fill="${FONDO}" stroke="none"><rect x="109" y="184" width="8" height="10" rx="2"/><rect x="147" y="184" width="8" height="10" rx="2"/></g>
          <g fill="rgba(255,255,255,.08)" stroke="${FONDO}" stroke-width="4" stroke-linejoin="miter"><rect x="98" y="177" width="26" height="24" rx="2"/><rect x="136" y="177" width="26" height="24" rx="2"/><path d="M124 187 h12" fill="none"/><path d="M98 187 h-14 M162 187 h14" fill="none"/></g>
        </g>
      </svg>
    </div>
  </div>
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'og-'));
const html = join(tmp, 'og.html');
writeFileSync(html, pagina);

// SU QUESTO MAC CHROME NON ESCE MAI dopo `--screenshot`: scrive il PNG, corretto,
// e resta vivo. Verificato il 05/09 — la prima corsa e' finita killata a mano dopo
// due minuti. Quindi non aspetto che finisca: lo lancio, aspetto il file, lo chiudo.
// Uno strumento che non termina non e' uno strumento.
const dest = join(SITO, 'og-image.png');
if (existsSync(dest)) unlinkSync(dest);

const proc = spawn(BROWSER, ['--headless=new', ...FLAG_ROOT, `--screenshot=${dest}`,
  `--window-size=${L},${A}`, '--hide-scrollbars', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--virtual-time-budget=3000',
  `--user-data-dir=${tmp}/prof`, html], { stdio: 'ignore', detached: false });

const dormi = ms => new Promise(r => setTimeout(r, ms));
let peso = -1, fermo = 0, atteso = 0;
while (atteso < 40000) {
  await dormi(300); atteso += 300;
  if (!existsSync(dest)) continue;
  const ora = statSync(dest).size;
  // il file c'e' e non cresce piu' da due giri: e' finito
  if (ora > 0 && ora === peso) { if (++fermo >= 2) break; } else fermo = 0;
  peso = ora;
}
proc.kill('SIGKILL');

if (!existsSync(dest) || statSync(dest).size === 0) {
  console.error('✗ il browser non ha prodotto l\'immagine'); process.exit(1);
}

unlinkSync(html);
console.log(`✓ og-image.png — ${L}×${A} · ${statSync(dest).size} byte (reso con ${BROWSER.split('/').pop()})`);
