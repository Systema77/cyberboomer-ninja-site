#!/usr/bin/env node
/**
 * collaudo.mjs — IL GUARDIANO di cyberboomer.ninja
 *
 *     node strumenti/collaudo.mjs
 *     node strumenti/collaudo.mjs --veloce     (salta il browser: solo controlli statici)
 *
 * COS'E'. Un collaudo che si fida solo di quello che misura. Fa due mestieri:
 *
 *   ① STATICO — legge i file e cerca le cose che non devono esserci:
 *      colori di altre case, parole vietate, link a posti che non esistono
 *      o che non abbiamo aperto, file obbligatori di un sito pubblico.
 *
 *   ② VIVO — apre davvero le pagine in un browser headless (Chrome o Brave, quello
 *      che c'e' sul Mac) a 320, 768 e 1600 px e guarda due cose che nessun grep
 *      puo' vedere: se la pagina sborda in orizzontale e se la console e' pulita.
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
    { re: /animagame|anima\s*game/gi, perche: 'il gioco tace: nessun nome, nessun dominio' },
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

  // Link che NON devono comparire finche' qualcuno non li verifica.
  linkNonAncoraAperti: [
    { re: /x\.com\/cyberboomer/gi, perche: 'l\'account X non e\' stato verificato da ROGUE: fino ad allora si scrive «in arrivo»' },
  ],

  // Quello che un sito pubblico deve avere.
  fileObbligatori: ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'favicon.svg',
                    'og-image.png', 'README.md', 'CLAUDE.md', 'lezioni/index.html'],

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

function pagine(dir = CASA_DIR, out = []) {
  for (const n of readdirSync(dir).sort()) {
    if (n.startsWith('.') || n === 'node_modules' || n === 'strumenti' || n === 'scripts') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pagine(p, out);
    else if (extname(p) === '.html') out.push(p);
  }
  return out;
}

const rel = p => relative(CASA_DIR, p);

/* ─────────────────────────── ① CONTROLLI STATICI ────────────────────────── */

function statici() {
  const html = pagine();

  // file obbligatori
  const mancanti = CASA.fileObbligatori.filter(f => !existsSync(join(CASA_DIR, f)));
  mancanti.length
    ? male(`file obbligatori: ne mancano ${mancanti.length}`, mancanti.join(' · '))
    : ok(`file obbligatori: tutti presenti`, `${CASA.fileObbligatori.length} file`);

  // colori vietati
  let trovatiColori = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    for (const [hex, chi] of Object.entries(CASA.coloriVietati)) {
      if (new RegExp(hex, 'i').test(t)) { male(`colore di un'altra casa in ${rel(p)}`, `${hex} — ${chi}`); trovatiColori++; }
    }
  }
  if (!trovatiColori) ok('colori: nessun colore di altre case', Object.keys(CASA.coloriVietati).join(' · '));

  // lessico
  let trovatiLessico = 0;
  for (const p of html) {
    let t = readFileSync(p, 'utf8');
    for (const e of CASA.lessicoEsenzioni) t = t.replace(e, '§');
    for (const { re, perche } of CASA.lessicoVietato) {
      const m = t.match(re);
      if (m) { male(`lessico in ${rel(p)}`, `«${m[0]}» ×${m.length} — ${perche}`); trovatiLessico++; }
    }
  }
  if (!trovatiLessico) ok('lessico: pulito', `${CASA.lessicoVietato.length} regole`);

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

  // link esterni: solo quelli ammessi
  let fuoriElenco = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    // solo i link su cui il lettore puo' cliccare: <a href>. Il canonical e og:url
    // sono l'indirizzo di casa propria, non una destinazione.
    for (const m of t.matchAll(/<a\b[^>]*\bhref="(https?:\/\/[^"]+)"/g)) {
      const u = m[1];
      if (u.startsWith(CASA.dominio)) continue;
      if (!CASA.linkAmmessi.some(a => u.startsWith(a))) {
        male(`link esterno non dichiarato in ${rel(p)}`, u); fuoriElenco++;
      }
    }
  }
  if (!fuoriElenco) ok('link esterni: tutti dichiarati nel blocco CASA');

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

  // il movimento si puo' spegnere
  let senzaRidotto = 0;
  for (const p of html) {
    const t = readFileSync(p, 'utf8');
    if (/animation:|transition:/.test(t) && !/prefers-reduced-motion/.test(t)) {
      male(`movimento senza freno in ${rel(p)}`, 'ci sono animazioni ma nessun blocco prefers-reduced-motion');
      senzaRidotto++;
    }
  }
  if (!senzaRidotto) ok('movimento: ogni pagina che si muove rispetta prefers-reduced-motion');

  return html;
}

/* ─────────────────────── ② CONTROLLI VIVI (browser) ─────────────────────── */

const BROWSER = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                 '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
                 '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);

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
  if (!BROWSER) { nota('browser non trovato: saltati i controlli vivi', 'nessun Chrome/Brave/Chromium in /Applications'); return; }

  const { srv, porta: portaWeb } = await servi();
  const indirizzo = p => `http://127.0.0.1:${portaWeb}/${relative(CASA_DIR, p).split(sep).join('/')}`;

  const porta = 9000 + Math.floor(Math.random() * 900);
  const proc = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${porta}`,
    `--user-data-dir=/tmp/collaudo-${porta}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars'], { stdio: 'ignore' });

  let vers = null;
  for (let i = 0; i < 40 && !vers; i++) {
    await dormi(250);
    try { vers = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json(); } catch {}
  }
  if (!vers) { proc.kill(); male('browser: non si è avviato', `porta ${porta}`); return; }

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
  if (!rumore) ok(`console pulita su tutte le pagine`, `${html.length} pagine`);

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
