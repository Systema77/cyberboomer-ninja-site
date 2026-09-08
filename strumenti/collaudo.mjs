#!/usr/bin/env node
/**
 * collaudo.mjs — IL GUARDIANO di cyberboomer.ninja
 *
 *     node strumenti/collaudo.mjs
 *     node strumenti/collaudo.mjs --veloce     (salta il browser: solo controlli statici)
 *
 * COS'E'. Un collaudo che si fida solo di quello che misura. Fa due mestieri:
 *
 *   ① STATICO — legge i file (gli HTML *e i fogli di stile*) e cerca le cose che
 *      non devono esserci: colori di altre case, parole vietate, link a posti che
 *      non esistono o che non abbiamo aperto, file obbligatori di un sito pubblico.
 *
 *   ② VIVO — apre davvero le pagine in un browser headless (Chrome, Brave o Chromium:
 *      quello che trova sul Mac, su Linux, nella cache di Playwright, o dove dice
 *      COLLAUDO_BROWSER) a 320, 768 e 1600 px e guarda due cose che nessun grep
 *      puo' vedere: se la pagina sborda in orizzontale e se la console e' pulita.
 *      Se un browser NON c'e', il collaudo completo e' ROSSO: «non ho guardato» non
 *      e' un verde. Per i soli controlli statici c'e' --veloce, e lo dice.
 *
 * PERCHE' NON HA DIPENDENZE. Niente `npm install`: usa il protocollo di debug del
 * browser via WebSocket, che Node ha di serie dalla 22. Un collaudo che per girare
 * ha bisogno di installare mezza internet e' un collaudo che fra sei mesi non gira.
 *
 * COME SI PORTA IN UN'ALTRA CASA: si cambia SOLO il blocco CASA qui sotto.
 * Tutto il resto e' meccanica e non si tocca.
 *
 * — creato da FLUX, 2026-09-05
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const QUI = dirname(fileURLToPath(import.meta.url));
const CASA_DIR = join(QUI, '..');

/* ══════════════════════════════════════════════════════════════════════════
   BLOCCO CASA — l'unica parte da cambiare portando il guardiano altrove
   ══════════════════════════════════════════════════════════════════════════ */
const CASA = {
  nome: 'cyberboomer.ninja — la voce',
  dominio: 'https://cyberboomer.ninja',

  // I colori DI QUESTA casa. Tutto il resto della galassia qui non entra.
  coloriPropri: ['#5C7CFF', '#0C0A0C', '#161216', '#EFE6EB', '#A89DA4', '#3B2E36'],

  // I colori delle ALTRE case: se compaiono qui, e' un errore di identita'.
  coloriVietati: {
    '#F2E205': 'giallo dell\'agenzia (systema77)',
    '#16E0DC': 'ciano del Systema',
    '#38E08A': 'verde del gioco',
    '#FF2E88': 'magenta (passato all\'agenzia)',
  },

  // Parole che qui non si scrivono, e perche'.
  lessicoVietato: [
    { re: /cyberboomer\.io/gi, perche: 'il .io e\' la console privata: non si nomina sul sito pubblico' },
    { re: /\bCyberboomer\b/g,  perche: '«Cyber Boomer» si scrive in DUE parole (eccetto nel dominio)' },
    // 05/09, ordine del Direttore: il NOME del gioco si può dire (la costellazione
    // lo dice con le sue parole); il DOMINIO no, il gioco resta a invito.
    { re: /animagame/gi, perche: 'il gioco è a invito: il dominio non si scrive' },
    { re: /\bsocial\b/gi, perche: 'lessico vietato in casa' },
  ],
  // Dove il lessico non si applica (il dominio contiene per forza «cyberboomer»).
  lessicoEsenzioni: [/cyberboomer\.ninja/gi, /x\.com\/cyberboomer/gi, /@cyberboomer/gi],

  // Link esterni ammessi: tutto il resto va dichiarato prima di comparire.
  linkAmmessi: [
    'https://systema77.com/', 'https://anima.solar/',
    'https://www.commissariatodips.it/', 'https://about.fb.com/',
    'https://support.google.com/', 'https://www.garanteprivacy.it/',
    'https://myactivity.google.com/', 'https://myadcenter.google.com/',
    'https://takeout.google.com/',
  ],

  // Chi puo' SERVIRCI file da fuori — audio, immagini, PDF, fogli, script — cioe' tutto
  // cio' che una pagina carica da sola con src=, url(), @import, fetch(). E' un'altra
  // cosa da un link su cui il lettore sceglie di cliccare: qui la pagina attinge senza
  // chiedere. Oggi VUOTO: gli ascolti avranno un host media, e si scrivera' qui prima.
  hostMediaAmmessi: [],

  // Indirizzi che compaiono ma non sono destinazioni: identificatori dentro un data-URI
  // (lo spazio dei nomi SVG della grana). Non vengono mai scaricati.
  spazioNomi: ['http://www.w3.org/'],

  // Link che NON devono comparire finche' qualcuno non li verifica.
  linkNonAncoraAperti: [
    { re: /x\.com\/cyberboomer/gi, perche: 'l\'account X non e\' stato verificato da ROGUE: fino ad allora si scrive «in arrivo»' },
  ],

  // Quello che un sito pubblico deve avere.
  fileObbligatori: ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'favicon.svg',
                    'og-image.png', 'README.md', 'CLAUDE.md', 'lezioni/index.html', 'stile.css'],

  // Le cartelle delle SCHEDE generate: ogni pagina che ci sta dentro (tranne l'indice)
  // porta una fonte pubblica cliccabile. La regola nasce per le lezioni e vale per
  // ogni tipo che verra' — dispense, ascolti, verdetti — perche' e' la stessa regola.
  schede: ['lezioni', 'dispense', 'ascolti', 'verdetti'],

  // I PESI. Un repo pubblico non dimentica: un file da 60 MB committato e tolto il
  // giorno dopo resta scaricabile per sempre da chi conosce il commit. Il tetto di
  // GitHub non e' il vincolo — la cronologia lo e'.
  pesi: {
    tettoFile: 4 * 1024 * 1024,                    // nessun file sopra i 4 MB (una dispensa PDF ci sta)
    cartelle: { 'dispense/file': 200 * 1024 * 1024 }, // e la cartella delle dispense sotto i 200 MB
    // formati che qui non entrano MAI: vivono fuori da git (seconda serratura, la prima e' .gitignore)
    estensioniVietate: ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.mp4', '.mov', '.webm',
                        '.tif', '.tiff', '.psd', '.raw', '.cr2', '.nef', '.dng'],
  },

  // Meta obbligatorie su ogni pagina che il pubblico puo' aprire.
  metaObbligatorie: [
    { re: /<meta[^>]+name="viewport"/i,        nome: 'viewport' },
    { re: /<meta[^>]+name="description"/i,     nome: 'description' },
    { re: /<link[^>]+rel="canonical"/i,        nome: 'canonical' },
    { re: /<meta[^>]+property="og:image"/i,    nome: 'og:image' },
    { re: /<link[^>]+rel="icon"/i,             nome: 'favicon' },
    { re: /<html[^>]+lang="it"/i,              nome: 'lang="it"' },
  ],

  // Niente cookie, niente tracker: si scrive in pagina, quindi si verifica.
  tracciantiVietati: [
    { re: /google-analytics|googletagmanager|gtag\(/i, perche: 'Google Analytics' },
    { re: /connect\.facebook\.net|fbq\(/i,             perche: 'pixel di Meta' },
    { re: /document\.cookie\s*=/i,                     perche: 'scrittura di cookie' },
    { re: /<script[^>]+src="https?:\/\//i,             perche: 'script da un dominio esterno' },
  ],

  // Le larghezze a cui la pagina deve reggere.
  larghezze: [320, 768, 1600],
};
/* ════════════════════ fine BLOCCO CASA — sotto, la meccanica ═══════════════ */

const VELOCE = process.argv.includes('--veloce');
const esiti = [];
const ok   = (t, d = '') => esiti.push({ stato: 'ok',  t, d });
const male = (t, d = '') => esiti.push({ stato: 'no',  t, d });
const nota = (t, d = '') => esiti.push({ stato: 'nota', t, d });

/* Cosa legge il guardiano. Dall'08/09 il vestito non sta piu' dentro gli HTML: sta in
   `/stile.css`. Se qui ci fosse solo `.html`, il controllo dei colori, quello del
   lessico e quello del movimento passerebbero in verde SENZA AVER LETTO IL CSS —
   un guardiano che diventa verde perche' e' diventato cieco e' peggio di nessun
   guardiano. Per questo i fogli di stile entrano nell'elenco nello stesso commit
   in cui il CSS e' uscito dalle pagine. */
const LETTI = new Set(['.html', '.css']);

function pagine(dir = CASA_DIR, out = []) {
  for (const n of readdirSync(dir).sort()) {
    if (n.startsWith('.') || n === 'node_modules' || n === 'strumenti' || n === 'scripts') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pagine(p, out);
    else if (LETTI.has(extname(p))) out.push(p);
  }
  return out;
}

const rel = p => relative(CASA_DIR, p);

/* ─────────────────────────── ① CONTROLLI STATICI ────────────────────────── */

function statici() {
  const tutte = pagine();
  const html  = tutte.filter(p => extname(p) === '.html');   // quello che il pubblico apre
  const fogli = tutte.filter(p => extname(p) === '.css');    // quello che il pubblico vede addosso alle pagine
  const letti = `${html.length} pagine + ${fogli.length} fogli`;

  // file obbligatori
  const mancanti = CASA.fileObbligatori.filter(f => !existsSync(join(CASA_DIR, f)));
  mancanti.length
    ? male(`file obbligatori: ne mancano ${mancanti.length}`, mancanti.join(' · '))
    : ok(`file obbligatori: tutti presenti`, `${CASA.fileObbligatori.length} file`);

  // colori vietati — negli HTML e nei fogli di stile
  let trovatiColori = 0;
  for (const p of tutte) {
    const t = readFileSync(p, 'utf8');
    for (const [hex, chi] of Object.entries(CASA.coloriVietati)) {
      if (new RegExp(hex, 'i').test(t)) { male(`colore di un'altra casa in ${rel(p)}`, `${hex} — ${chi}`); trovatiColori++; }
    }
  }
  if (!trovatiColori) ok('colori: nessun colore di altre case', `${Object.keys(CASA.coloriVietati).join(' · ')} — letti ${letti}`);

  // lessico — negli HTML e nei fogli di stile (anche un commento CSS e' in piazza)
  let trovatiLessico = 0;
  for (const p of tutte) {
    let t = readFileSync(p, 'utf8');
    for (const e of CASA.lessicoEsenzioni) t = t.replace(e, '§');
    for (const { re, perche } of CASA.lessicoVietato) {
      const m = t.match(re);
      if (m) { male(`lessico in ${rel(p)}`, `«${m[0]}» ×${m.length} — ${perche}`); trovatiLessico++; }
    }
  }
  if (!trovatiLessico) ok('lessico: pulito', `${CASA.lessicoVietato.length} regole — letti ${letti}`);

  // link non ancora aperti
  let trovatiLink = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    for (const { re, perche } of CASA.linkNonAncoraAperti) {
      const m = t.match(re);
      if (m) { male(`link non verificato in ${rel(p)}`, `${m[0]} — ${perche}`); trovatiLink++; }
    }
  }
  if (!trovatiLink) ok('link: nessun rimando a posti non ancora aperti');

  // link interni: esistono davvero?
  let rotti = 0, controllati = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    for (const m of t.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const dest = m[1].split(/[?#]/)[0];
      // un indirizzo con lo schema (https:, mailto:, data:) non e' un file su disco
      if (!dest || dest.startsWith('#') || dest.startsWith('//') || /^[a-zA-Z][\w+.-]*:/.test(dest)) continue;
      controllati++;
      // un percorso che comincia con / parte dalla radice del sito, non dalla pagina
      const fisico = dest.startsWith('/') ? join(CASA_DIR, dest.slice(1)) : join(dirname(p), dest);
      if (!existsSync(fisico)) { male(`link interno rotto in ${rel(p)}`, dest); rotti++; }
    }
  }
  if (!rotti) ok('link interni: tutti risolvono', `${controllati} controllati`);

  // indirizzi esterni: tre porte, tre elenchi. Una pagina esce da casa in tre modi e
  // fino all'08/09 il guardiano ne guardava uno solo (<a href>): un <audio src="https://…">
  // sarebbe passato con rapporto verde (rischio 5 del piano).
  const diCasa = u => u.startsWith(CASA.dominio);
  const inElenco = (u, elenco) => elenco.some(a => u.startsWith(a));
  const URL_ = String.raw`https?:\/\/[^\s"'<>)]+`;
  let fuoriElenco = 0, attinti = 0, nominati = 0;
  for (const p of tutte) {
    const t = readFileSync(p, 'utf8');
    // ① dove il LETTORE clicca: <a href> → linkAmmessi
    for (const m of t.matchAll(new RegExp(String.raw`<a\b[^>]*\bhref="(${URL_})"`, 'g'))) {
      if (!diCasa(m[1]) && !inElenco(m[1], CASA.linkAmmessi)) { male(`link esterno non dichiarato in ${rel(p)}`, m[1]); fuoriElenco++; }
    }
    // ② dove la PAGINA attinge da sola: src= poster= data= url() @import fetch() WebSocket() → hostMediaAmmessi
    const attingono = [
      new RegExp(String.raw`\b(?:src|poster|data)="(${URL_})"`, 'g'),
      new RegExp(String.raw`url\(\s*["']?(${URL_})`, 'g'),
      new RegExp(String.raw`@import\s+(?:url\()?["']?(${URL_})`, 'g'),
      new RegExp(String.raw`\b(?:fetch|WebSocket|XMLHttpRequest|import)\(\s*["'](${URL_})`, 'g'),
    ];
    for (const re of attingono) for (const m of t.matchAll(re)) {
      attinti++;
      if (!diCasa(m[1]) && !inElenco(m[1], CASA.hostMediaAmmessi)) { male(`la pagina attinge da un host non dichiarato in ${rel(p)}`, m[1]); fuoriElenco++; }
    }
    // un indirizzo senza schema («//host/…») e' esterno e sfugge a tutto: qui non si scrive
    for (const m of t.matchAll(/\b(?:src|href|poster)="(\/\/[^"]+)"/g)) { male(`indirizzo senza schema in ${rel(p)}`, m[1]); fuoriElenco++; }
    // ③ tutto il resto (meta, canonical, testo, commenti): deve stare in UNO degli elenchi
    for (const m of t.matchAll(new RegExp(URL_, 'g'))) {
      nominati++;
      const u = m[0];
      if (diCasa(u) || inElenco(u, CASA.linkAmmessi) || inElenco(u, CASA.hostMediaAmmessi) || inElenco(u, CASA.spazioNomi)) continue;
      male(`indirizzo esterno non dichiarato in ${rel(p)}`, u); fuoriElenco++;
    }
  }
  if (!fuoriElenco) ok('indirizzi esterni: tutti dichiarati nel blocco CASA', `${nominati} nominati · ${attinti} attinti dalla pagina (src/url/@import/fetch)`);

  // la fonte su ogni scheda, qualunque sia il tipo
  let senzaFonte = 0, schedeViste = 0;
  for (const cartella of CASA.schede) {
    const dir = join(CASA_DIR, cartella);
    if (!existsSync(dir)) continue;
    for (const p of html.filter(x => x.startsWith(dir + sep) && !x.endsWith(sep + 'index.html'))) {
      schedeViste++;
      const t = readFileSync(p, 'utf8');
      if (!/class="fonte"[\s\S]*?<a\b[^>]*\bhref="https?:\/\//.test(t)) { male(`scheda senza fonte cliccabile: ${rel(p)}`, 'ogni scheda porta un blocco .fonte con un link http(s)'); senzaFonte++; }
    }
  }
  if (!senzaFonte) ok('fonte: ogni scheda ne porta una cliccabile', `${schedeViste} schede in ${CASA.schede.filter(c => existsSync(join(CASA_DIR, c))).join(', ')}`);

  // i pesi, e i formati che qui non entrano
  const tuttiIFile = (dir = CASA_DIR, out = []) => {
    for (const n of readdirSync(dir).sort()) {
      if (n === '.git' || n === 'node_modules') continue;
      const p = join(dir, n);
      statSync(p).isDirectory() ? tuttiIFile(p, out) : out.push(p);
    }
    return out;
  };
  const MB = b => `${(b / 1024 / 1024).toFixed(1)} MB`;
  let pesanti = 0, totale = 0; const perCartella = {};
  for (const p of tuttiIFile()) {
    const { size } = statSync(p); totale += size;
    if (CASA.pesi.estensioniVietate.includes(extname(p).toLowerCase())) { male(`formato che qui non entra: ${rel(p)}`, 'audio, video e master vivono FUORI da git: la cronologia di un repo pubblico e\' per sempre'); pesanti++; }
    if (size > CASA.pesi.tettoFile) { male(`file troppo pesante: ${rel(p)}`, `${MB(size)} > tetto ${MB(CASA.pesi.tettoFile)}`); pesanti++; }
    for (const c of Object.keys(CASA.pesi.cartelle)) if (rel(p).startsWith(c + '/')) perCartella[c] = (perCartella[c] ?? 0) + size;
  }
  for (const [c, tetto] of Object.entries(CASA.pesi.cartelle)) {
    if ((perCartella[c] ?? 0) > tetto) { male(`cartella troppo pesante: ${c}/`, `${MB(perCartella[c])} > tetto ${MB(tetto)}`); pesanti++; }
  }
  if (!pesanti) ok('pesi: nessun file sopra il tetto, nessun formato vietato', `${MB(totale)} in tutto · tetto ${MB(CASA.pesi.tettoFile)} a file`);

  // meta obbligatorie
  let metaMancanti = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    const buchi = CASA.metaObbligatorie.filter(m => !m.re.test(t)).map(m => m.nome);
    if (buchi.length) { male(`meta mancanti in ${rel(p)}`, buchi.join(' · ')); metaMancanti++; }
  }
  if (!metaMancanti) ok(`meta: complete su tutte le pagine`, `${html.length} pagine × ${CASA.metaObbligatorie.length} controlli`);

  // niente cookie, niente tracker
  let tracker = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    for (const { re, perche } of CASA.tracciantiVietati) {
      if (re.test(t)) { male(`tracciante in ${rel(p)}`, perche); tracker++; }
    }
  }
  if (!tracker) ok('niente cookie e niente tracker: verificato, non dichiarato');

  // il movimento si puo' spegnere — in ogni file che ne contiene, HTML o CSS
  let senzaRidotto = 0;
  for (const p of tutte) {
    const t = readFileSync(p, 'utf8');
    if (/animation:|transition:/.test(t) && !/prefers-reduced-motion/.test(t)) {
      male(`movimento senza freno in ${rel(p)}`, 'ci sono animazioni ma nessun blocco prefers-reduced-motion');
      senzaRidotto++;
    }
  }
  if (!senzaRidotto) ok('movimento: ogni file che si muove rispetta prefers-reduced-motion', `letti ${letti}`);

  return html;
}

/* ─────────────────────── ② CONTROLLI VIVI (browser) ─────────────────────── */

/* Dove si cerca il browser. Fino all'08/09 solo in /Applications: su Linux e in CI i
   controlli vivi saltavano in silenzio e il processo usciva 0 (rischio 6 del piano).
   Ordine: quello indicato a mano, il Mac, Linux, la cache di Playwright. */
const dentro = (dir, coda) => {
  try { return readdirSync(dir).filter(n => n.startsWith('chromium')).sort().reverse().map(n => join(dir, n, coda)); }
  catch { return []; }
};
const CANDIDATI_BROWSER = [
  process.env.COLLAUDO_BROWSER,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...dentro(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '', 'chrome-linux/chrome'),
  ...dentro('/opt/pw-browsers', 'chrome-linux/chrome'),
  ...dentro(join(process.env.HOME ?? '', '.cache/ms-playwright'), 'chrome-linux/chrome'),
].filter(Boolean);
const BROWSER = CANDIDATI_BROWSER.find(existsSync);
// Come root (contenitori, CI) Chromium rifiuta di partire senza --no-sandbox: non e' una
// scelta di sicurezza nostra, e' la condizione per misurare qualcosa in quelle stanze.
const FLAG_ROOT = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

function cdp(ws) {
  let id = 0; const attesa = new Map(); const eventi = [];
  const sock = new WebSocket(ws);
  sock.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && attesa.has(m.id)) { attesa.get(m.id)(m.result ?? {}); attesa.delete(m.id); }
    else if (m.method) eventi.push(m);
  });
  const pronto = new Promise(r => sock.addEventListener('open', r));
  return {
    pronto, eventi,
    manda: (method, params = {}) => new Promise(r => {
      const n = ++id; attesa.set(n, r); sock.send(JSON.stringify({ id: n, method, params }));
    }),
    chiudi: () => sock.close(),
  };
}

const dormi = ms => new Promise(r => setTimeout(r, ms));

/* Il sito si collauda COME LO SERVE IL WEB, non come file sul disco: con `file://`
   un percorso assoluto tipo `/favicon.svg` punta alla radice del Mac e la console
   si sporca di errori che in produzione non esistono. Successo il 05/09 sul 404,
   che usa i percorsi assoluti apposta — perche' puo' essere servito da qualunque
   indirizzo. Un collaudo che mente sul contesto non e' un collaudo. */
const TIPI = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.mjs':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.xml':'application/xml',
  '.txt':'text/plain; charset=utf-8', '.json':'application/json', '.ico':'image/x-icon' };

function servi() {
  const srv = createServer((req, res) => {
    let via = decodeURIComponent(req.url.split('?')[0]);
    if (via.endsWith('/')) via += 'index.html';
    const f = join(CASA_DIR, via.replace(/^\/+/, ''));
    if (!f.startsWith(CASA_DIR) || !existsSync(f) || statSync(f).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(existsSync(join(CASA_DIR, '404.html'))
        ? readFileSync(join(CASA_DIR, '404.html')) : 'non c\'e\'');
    }
    res.writeHead(200, { 'content-type': TIPI[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, porta: srv.address().port })));
}

async function vivi(html) {
  if (!BROWSER) {
    male('controlli vivi NON eseguiti: nessun browser trovato',
         `sbordamenti e console restano NON misurati. Cercato in ${CANDIDATI_BROWSER.length} posti (Mac, Linux, cache Playwright). ` +
         `Indica il tuo: COLLAUDO_BROWSER=/percorso/del/browser — o lancia --veloce, che dichiara di fare solo gli statici`);
    return;
  }

  const { srv, porta: portaWeb } = await servi();
  const indirizzo = p => `http://127.0.0.1:${portaWeb}/${relative(CASA_DIR, p).split(sep).join('/')}`;

  const porta = 9000 + Math.floor(Math.random() * 900);
  const proc = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${porta}`,
    `--user-data-dir=/tmp/collaudo-${porta}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', ...FLAG_ROOT], { stdio: 'ignore' });

  let vers = null;
  for (let i = 0; i < 40 && !vers; i++) {
    await dormi(250);
    try { vers = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json(); } catch {}
  }
  if (!vers) { proc.kill(); male('browser: non si è avviato', `${BROWSER} — porta ${porta}`); return; }

  const b = cdp(vers.webSocketDebuggerUrl); await b.pronto;

  let sbordi = 0, rumore = 0;
  for (const p of html) {
    const { targetId } = await b.manda('Target.createTarget', { url: 'about:blank' });
    const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
    const t = lista.find(x => x.id === targetId);
    const pg = cdp(t.webSocketDebuggerUrl); await pg.pronto;

    await pg.manda('Page.enable'); await pg.manda('Runtime.enable'); await pg.manda('Log.enable');

    for (const w of CASA.larghezze) {
      await pg.manda('Emulation.setDeviceMetricsOverride',
        { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 });
      await pg.manda('Page.navigate', { url: indirizzo(p) });
      await dormi(500);
      const { result } = await pg.manda('Runtime.evaluate', {
        expression: `({ doc: document.documentElement.scrollWidth, win: window.innerWidth })`,
        returnByValue: true,
      });
      const { doc, win } = result.value;
      if (doc > win + 1) { male(`sborda in orizzontale: ${rel(p)} a ${w}px`, `contenuto ${doc}px in una finestra da ${win}px`); sbordi++; }
    }

    const brutti = pg.eventi.filter(e =>
      (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type)) ||
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Log.entryAdded' && ['error'].includes(e.params.entry.level)));
    if (brutti.length) {
      const primo = brutti[0];
      const testo = primo.params?.entry?.text
        ?? primo.params?.exceptionDetails?.text
        ?? primo.params?.args?.map(a => a.value ?? a.description).join(' ') ?? '?';
      male(`console sporca: ${rel(p)}`, `${brutti.length} messaggi — primo: ${String(testo).slice(0, 120)}`);
      rumore++;
    }
    pg.chiudi();
    await b.manda('Target.closeTarget', { targetId });
  }

  if (!sbordi) ok(`nessuna pagina sborda`, `${html.length} pagine × ${CASA.larghezze.join('/')} px`);
  if (!rumore) ok(`console pulita su tutte le pagine`, `${html.length} pagine · ${BROWSER}`);

  b.chiudi(); proc.kill(); srv.close();
}

/* ─────────────────────────────── il verdetto ────────────────────────────── */

const html = statici();
if (!VELOCE) await vivi(html);

const N = esiti.filter(e => e.stato === 'no').length;
const S = esiti.filter(e => e.stato === 'ok').length;

console.log(`\n  ◉ IL GUARDIANO — ${CASA.nome}\n`);
for (const e of esiti) {
  const segno = e.stato === 'ok' ? '  ✓' : e.stato === 'no' ? '  ✗' : '  ·';
  console.log(`${segno} ${e.t}${e.d ? `\n      ${e.d}` : ''}`);
}
console.log(`\n  ${S} verdi · ${N} rossi${VELOCE ? ' · (solo statici: --veloce)' : ''}\n`);
process.exit(N ? 1 : 0);
