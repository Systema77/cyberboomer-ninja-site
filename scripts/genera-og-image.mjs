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
 *
 * — creato da FLUX, 2026-09-05
 */
import { writeFileSync, unlinkSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const QUI = dirname(fileURLToPath(import.meta.url));
const SITO = join(QUI, '..');
const L = 1200, A = 630;

const BROWSER = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                 '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
                 '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
if (!BROWSER) { console.error('✗ serve Chrome, Brave o Chromium in /Applications'); process.exit(1); }

const V = '#5C7CFF', FONDO = '#0C0A0C', CARTA = '#EFE6EB', MUTO = '#A89DA4', LINEA = '#3B2E36';

const pagina = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${L}px;height:${A}px;background:${FONDO};overflow:hidden}
  .t{ width:${L}px; height:${A}px; padding:74px 80px; position:relative;
      font-family:'Courier Prime','Courier New',monospace; color:${CARTA}; }
  .barra{ position:absolute; top:0; left:0; right:0; height:6px; background:${V}; }
  .occhiello{ font-size:26px; letter-spacing:.34em; color:${MUTO}; text-transform:uppercase; }
  .nome{ margin-top:58px; font-size:88px; font-weight:700; letter-spacing:.02em; line-height:1; }
  .nome .p{ color:${V}; }
  .riga{ display:flex; align-items:center; gap:24px; margin-top:34px; }
  .cur{ width:30px; height:56px; background:${V}; flex:none; }
  .claim{ font-size:33px; color:${MUTO}; font-family:Georgia,'Iowan Old Style',serif; }
  .sep{ margin-top:56px; border-top:2px solid ${LINEA}; }
  .piede{ margin-top:38px; display:flex; justify-content:space-between; align-items:flex-end; }
  .piede .a{ font-size:26px; line-height:1.6; }
  .piede .a b{ color:${CARTA}; font-weight:400; display:block; }
  .piede .a span{ color:${MUTO}; }
  .piede .crew{ font-size:22px; letter-spacing:.3em; color:${MUTO}; }
</style></head><body>
  <div class="t">
    <div class="barra"></div>
    <div class="occhiello">La voce · divulgazione dal 2077</div>
    <div class="nome">CYBER BOOMER<span class="p">.ninja</span></div>
    <div class="riga"><div class="cur"></div><div class="claim">Trappole digitali vere, smontate ridendo.</div></div>
    <div class="sep"></div>
    <div class="piede">
      <div class="a"><b>Con la fonte, sempre.</b><span>Gratis · senza account · senza cookie</span></div>
      <div class="crew">SYSTEMA 77</div>
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

const proc = spawn(BROWSER, ['--headless=new', `--screenshot=${dest}`,
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
