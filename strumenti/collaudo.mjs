#!/usr/bin/env node
/**
 * collaudo.mjs — IL GUARDIANO di cyberboomer.ninja
 *
 *     node strumenti/collaudo.mjs
 *     node strumenti/collaudo.mjs --veloce     (salta il browser: solo controlli statici)
 *
 * COS'E'. Un collaudo che si fida solo di quello che misura. Fa due mestieri:
 *
 *   ① STATICO — legge i file che Pages serve (HTML, CSS, JS, SVG, JSON, XML, TXT) e
 *      cerca le cose che non devono esserci: colori di altre case (anche scritti in
 *      rgb() o dentro un data-URI), parole vietate (anche scritte a entita'), indirizzi
 *      esterni non dichiarati (dove il lettore clicca, dove la pagina attinge da sola,
 *      dove si nominano), file obbligatori, la fonte su ogni scheda, i pesi.
 *
 *   ② VIVO — apre davvero le pagine in un browser headless (Chrome, Brave o Chromium:
 *      quello che trova sul Mac, su Linux, nella cache di Playwright, o dove dice
 *      COLLAUDO_BROWSER) a 320, 768 e 1600 px e guarda quattro cose che nessun grep
 *      puo' vedere: se la pagina sborda in orizzontale, se la console e' pulita, QUALI
 *      HOST LA PAGINA CHIAMA DAVVERO (rete intercettata: un URL costruito a pezzi in
 *      uno script non sfugge qui) e se scrive cookie.
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
 * L'08/09 una revisione avversaria (95 casi) ha trovato 21 modi di passare in verde
 * violando le regole: regex legate alle virgolette doppie, `scripts/` e `strumenti/`
 * mai letti ma serviti, la fonte soddisfatta dal piede di pagina, il lessico scritto a
 * entita'. La meccanica e' stata riscritta su quei casi, che restano il suo banco.
 *
 * — creato da FLUX, 2026-09-05 · meccanica riscritta da JUDY, 2026-09-08
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname, sep, basename } from 'node:path';
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
  // Si cercano come #hex (maiuscolo o minuscolo), come rgb()/rgba() equivalenti, e
  // dentro i data-URI (percent-encoded o base64). Non si cercano in hsl(): un colore
  // scritto in hsl() per aggirare il guardiano e' una scelta, non una svista.
  coloriVietati: {
    '#F2E205': 'giallo dell\'agenzia (systema77)',
    '#16E0DC': 'ciano del Systema',
    '#38E08A': 'verde del gioco',
    '#FF2E88': 'magenta (passato all\'agenzia)',
  },

  // Parole che qui non si scrivono, e perche'. Ogni regola porta le SUE eccezioni
  // (`salvo`), applicate solo a lei: un'eccezione per «@cyberboomer» non deve coprire
  // «cyberboomer.io» (era cosi' fino all'08/09, e «boomer@cyberboomer.io» passava).
  lessicoVietato: [
    { re: /cyberboomer\.io/gi, perche: 'il .io e\' la console privata: non si nomina sul sito pubblico' },
    { re: /\bcyberboomers?\b/gi, perche: '«Cyber Boomer» si scrive in DUE parole (eccetto nel dominio e nel nome utente)',
      salvo: [/cyberboomer\.ninja/gi, /x\.com\/cyberboomer/gi, /twitter\.com\/cyberboomer/gi, /@cyberboomer\b/gi] },
    // 05/09, ordine del Direttore: il NOME del gioco si può dire (la costellazione
    // lo dice con le sue parole); il DOMINIO no, il gioco resta a invito.
    { re: /animagame/gi, perche: 'il gioco è a invito: il dominio non si scrive' },
    { re: /\bsocial\b/gi, perche: 'lessico vietato in casa' },
  ],

  // Link esterni ammessi: dove il LETTORE puo' cliccare. Tutto il resto va dichiarato
  // prima di comparire — vale anche per le fonti dei verdetti (porta-verdetti.py dice
  // quali host mancano).
  linkAmmessi: [
    'https://systema77.com/', 'https://anima.solar/',
    'https://www.commissariatodips.it/', 'https://about.fb.com/',
    'https://support.google.com/', 'https://www.garanteprivacy.it/',
    'https://myactivity.google.com/', 'https://myadcenter.google.com/',
    'https://takeout.google.com/',
  ],

  // Chi puo' SERVIRCI file da fuori — audio, immagini, PDF, fogli, script — cioe' tutto
  // cio' che una pagina carica da sola (src, srcset, href di <link>, action, poster,
  // url(), @import, fetch, e qualunque URL dentro uno <script>). E' un'altra cosa da un
  // link su cui il lettore sceglie di cliccare: qui la pagina attinge senza chiedere.
  // Oggi VUOTO: gli ascolti avranno un host media, e si scrivera' qui prima.
  hostMediaAmmessi: [],

  // Indirizzi che compaiono ma non sono destinazioni: gli spazi dei nomi XML/SVG
  // (xmlns della grana e del favicon, lo schema della sitemap). Non vengono mai scaricati.
  spazioNomi: ['http://www.w3.org/', 'http://www.sitemaps.org/'],

  // Link che NON devono comparire finche' qualcuno non li verifica.
  linkNonAncoraAperti: [
    { re: /(?:x|twitter)\.com\/cyberboomer/gi, perche: 'l\'account X non e\' stato verificato da ROGUE: fino ad allora si scrive «in arrivo»' },
  ],

  // Quello che un sito pubblico deve avere.
  fileObbligatori: ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'favicon.svg',
                    'og-image.png', 'README.md', 'CLAUDE.md', 'lezioni/index.html', 'stile.css',
                    'archivio.json', '_config.yml'],

  // Le cartelle delle SCHEDE generate: ogni pagina che ci sta dentro (tranne l'indice
  // della cartella stessa) porta una fonte pubblica cliccabile DENTRO il blocco .fonte.
  schede: ['lezioni', 'dispense', 'ascolti', 'verdetti'],

  // Meta obbligatorie su ogni pagina che il pubblico puo' aprire (i commenti non contano).
  metaObbligatorie: [
    { re: /<meta[^>]+name=["']viewport["']/i,        nome: 'viewport' },
    { re: /<meta[^>]+name=["']description["']/i,     nome: 'description' },
    { re: /<link[^>]+rel=["']canonical["']/i,        nome: 'canonical' },
    { re: /<meta[^>]+property=["']og:image["']/i,    nome: 'og:image' },
    { re: /<link[^>]+rel=["']icon["']/i,             nome: 'favicon' },
    { re: /<html[^>]+lang=["']it["']/i,              nome: 'lang="it"' },
  ],

  // Niente cookie, niente tracker: si scrive in pagina, quindi si verifica. Qui le
  // FORME nel sorgente; nel giro vivo si guardano la rete e i cookie veri.
  tracciantiVietati: [
    { re: /google-analytics|googletagmanager|gtag\(|plausible\.io|matomo|hotjar|clarity\.ms/i, perche: 'tracker di terzi' },
    { re: /connect\.facebook\.net|fbq\(/i,             perche: 'pixel di Meta' },
    { re: /document\s*(?:\.\s*cookie|\[\s*["']cookie["']\s*\])\s*[+]?=|cookieStore\s*\.\s*set/i, perche: 'scrittura di cookie' },
    { re: /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:)?\/\//i, perche: 'script da un dominio esterno' },
    { re: /<base\b/i,                                  perche: '<base>: manderebbe ogni indirizzo relativo fuori casa' },
  ],

  // LA RICERCA. L'indice e' un JSON generato che il <script> inline dell'indice del dojo
  // legge per intero: oltre le ~1500 voci questo disegno e' finito, e ce ne dobbiamo
  // accorgere noi prima dei lettori. Ogni voce deve puntare a una pagina che esiste.
  ricerca: { indice: 'archivio.json', tettoVoci: 1500 },

  // I PESI, in MB decimali (1 MB = 1.000.000 byte, come li legge chiunque). Un repo
  // pubblico non dimentica: un file da 60 MB committato e tolto il giorno dopo resta
  // scaricabile per sempre. Il tetto di GitHub non e' il vincolo — la cronologia lo e'.
  pesi: {
    tettoFile: 4_000_000,                          // nessun file sopra i 4 MB (una dispensa PDF ci sta)
    cartelle: { 'dispense/file': 200_000_000 },      // e la cartella delle dispense sotto i 200 MB
    // formati che qui non entrano MAI: vivono fuori da git (seconda serratura, la prima e' .gitignore)
    estensioniVietate: ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.oga', '.opus', '.aiff', '.aif', '.wma',
                        '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.mpg', '.mpeg', '.3gp',
                        '.tif', '.tiff', '.psd', '.raw', '.cr2', '.nef', '.dng'],
  },

  // Le larghezze a cui la pagina deve reggere.
  larghezze: [320, 768, 1600],
};
/* ════════════════════ fine BLOCCO CASA — sotto, la meccanica ═══════════════ */

const VELOCE = process.argv.includes('--veloce');
const esiti = [];
const ok   = (t, d = '') => esiti.push({ stato: 'ok',  t, d });
const male = (t, d = '') => esiti.push({ stato: 'no',  t, d });
const nota = (t, d = '') => esiti.push({ stato: 'nota', t, d });

/* Cosa legge il guardiano: tutto cio' che GitHub Pages serve e che puo' portare un
   colore, una parola o un indirizzo. Le estensioni si confrontano in minuscolo
   (PROVA.HTML e' servita uguale). `scripts/` e `strumenti/` non si leggono perche'
   `_config.yml` li esclude dal sito (il guardiano stesso deve poter nominare i colori
   vietati) — ⚠️ da misurare dal runner dopo la prima pubblicazione: la riga e' in
   anima-console/.github/workflows/prova-porta.yml. Le cartelle che cominciano con «_»
   non le serve Jekyll e restano fuori; quelle che cominciano con «.» (es. .well-known)
   Pages le serve, e si leggono. */
const PAGINE = new Set(['.html', '.htm']);
const CODICE = new Set(['.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json', '.webmanifest']);
const NON_SERVITI = new Set(['.git', 'node_modules', 'strumenti', 'scripts']);

function pagine(dir = CASA_DIR, out = []) {
  for (const n of readdirSync(dir).sort()) {
    if (NON_SERVITI.has(n) || n.startsWith('_')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pagine(p, out);
    else if (PAGINE.has(estensione(p)) || CODICE.has(estensione(p))) out.push(p);
  }
  return out;
}

const estensione = p => extname(p).toLowerCase();
const rel = p => relative(CASA_DIR, p);
const senzaCommenti = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/* Il testo come lo LEGGE un browser, non come e' scritto: entita' numeriche sciolte
   (&#115;ocial → social), caratteri di formato Unicode tolti (lo zero-width space in
   mezzo a una parola), data-URI decodificati (percent-encoding e base64) e accodati,
   cosi' un colore o una parola nascosti la' dentro si vedono. */
function comeLetto(t) {
  let s = t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[n])
    .replace(/[​-‏⁠﻿­]/g, '');
  const extra = [];
  for (const m of s.matchAll(/data:[^,"')\s]*;base64,([A-Za-z0-9+/=]+)/g)) {
    try { extra.push(Buffer.from(m[1], 'base64').toString('utf8')); } catch {}
  }
  for (const m of s.matchAll(/data:[^,"')\s]*,([^"')\s]+)/g)) {
    try { extra.push(decodeURIComponent(m[1])); } catch {}
  }
  return extra.length ? s + '\n' + extra.join('\n') : s;
}

/* Un colore vietato in tutte le forme in cui un foglio di stile lo accetta. */
function formeColore(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const sp = String.raw`\s*[,\s]\s*`;
  return [
    new RegExp(hex.slice(1) + String.raw`(?![0-9a-f])`, 'i'),                     // F2E205, anche dentro %23F2E205
    new RegExp(String.raw`rgba?\(\s*${r}${sp}${g}${sp}${b}\s*[,/)]`, 'i'),         // rgb(242, 226, 5) · rgb(242 226 5) · rgba(...)
  ];
}

/* OGNI indirizzo in un file, classificato per DOVE sta:
     link    → l'href di un <a>: dove il lettore clicca
     carico  → un attributo di qualunque altro tag (src, srcset, href di <link>, action,
               poster, ping, data, content di un refresh…), il contenuto di <script> e
               <style>, un file CSS/JS/SVG/JSON: dove la pagina attinge DA SOLA
     testo   → la prosa e i commenti: dove si nomina soltanto
   Si guardano i token dei tag, non le virgolette: `src='…'`, `SRC=…` senza virgolette e
   `HTTPS://` valgono come i loro fratelli educati. Dentro gli script `https:\/\/` viene
   raddrizzato prima di guardare. */
const URL_RE = /(?:https?:\/\/|(?<![:\w/])\/\/)[^\s"'<>()`\\,]+/gi;

function indirizzi(t, isHtml) {
  const out = [];
  const spingi = (frammento, dove, codice = false) => {
    const s = codice ? frammento.replace(/\\\//g, '/') : frammento;
    for (const m of s.matchAll(URL_RE)) {
      // in un file JS «//» apre un commento, non un indirizzo: li' si contano solo gli schemi pieni
      if (m[0].startsWith('//') && codice) continue;
      out.push({ u: m[0], dove });
    }
  };
  if (!isHtml) { spingi(t, 'carico', true); return out; }
  const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let i = 0, dentro = null, m;
  while ((m = TAG.exec(t))) {
    spingi(t.slice(i, m.index), dentro ? 'carico' : 'testo', !!dentro);
    i = TAG.lastIndex;
    if (m[0].startsWith('<!--')) { spingi(m[0], 'testo'); continue; }
    const chiude = m[1] === '/', nome = m[2].toLowerCase(), attrs = m[3] ?? '';
    if (!chiude && (nome === 'script' || nome === 'style')) dentro = nome;
    if (chiude && nome === dentro) dentro = null;
    for (const u of attrs.matchAll(URL_RE)) {
      const prima = attrs.slice(0, u.index);
      const attr = (prima.match(/([a-zA-Z-]+)\s*=\s*["']?[^"'=]*$/) || [])[1]?.toLowerCase();
      out.push({ u: u[0], dove: nome === 'a' && attr === 'href' ? 'link' : 'carico' });
    }
  }
  spingi(t.slice(i), dentro ? 'carico' : 'testo', !!dentro);
  return out;
}

/* ─────────────────────────── ① CONTROLLI STATICI ────────────────────────── */

function statici() {
  const tutte = pagine();
  const html  = tutte.filter(p => PAGINE.has(estensione(p)));   // quello che il pubblico apre
  const letti = `${html.length} pagine + ${tutte.length - html.length} file di codice`;
  const diCasa = u => u.toLowerCase().startsWith(CASA.dominio);
  const inElenco = (u, elenco) => elenco.some(a => u.toLowerCase().startsWith(a.toLowerCase()));

  // file obbligatori
  const mancanti = CASA.fileObbligatori.filter(f => !existsSync(join(CASA_DIR, f)));
  mancanti.length
    ? male(`file obbligatori: ne mancano ${mancanti.length}`, mancanti.join(' · '))
    : ok(`file obbligatori: tutti presenti`, `${CASA.fileObbligatori.length} file`);

  // colori vietati — in ogni forma, in ogni file servito, anche dentro i data-URI
  let trovatiColori = 0;
  for (const p of tutte) {
    const t = comeLetto(readFileSync(p, 'utf8'));
    for (const [hex, chi] of Object.entries(CASA.coloriVietati)) {
      const forma = formeColore(hex).find(re => re.test(t));
      if (forma) { male(`colore di un'altra casa in ${rel(p)}`, `${hex} (${chi}) — trovato come ${t.match(forma)[0]}`); trovatiColori++; }
    }
  }
  if (!trovatiColori) ok('colori: nessun colore di altre case', `${Object.keys(CASA.coloriVietati).join(' · ')} — anche come rgb() e nei data-URI — letti ${letti}`);

  // lessico — come lo legge un browser, con le eccezioni di ciascuna regola
  let trovatiLessico = 0;
  for (const p of tutte) {
    const base = comeLetto(readFileSync(p, 'utf8'));
    for (const { re, perche, salvo = [] } of CASA.lessicoVietato) {
      let t = base;
      for (const s of salvo) t = t.replace(s, '§');
      const m = t.match(re);
      if (m) { male(`lessico in ${rel(p)}`, `«${m[0]}» ×${m.length} — ${perche}`); trovatiLessico++; }
    }
  }
  if (!trovatiLessico) ok('lessico: pulito', `${CASA.lessicoVietato.length} regole — letti ${letti}`);

  // link non ancora aperti
  let trovatiLink = 0;
  for (const p of tutte) {
    const t = comeLetto(readFileSync(p, 'utf8'));
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
    for (const m of t.matchAll(/\b(?:href|src|poster|data)\s*=\s*["']([^"']+)["']/gi)) {
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

  // indirizzi esterni: tre porte, tre regole (rischio 5 del piano)
  let fuoriElenco = 0, nLink = 0, nCarico = 0, nTesto = 0;
  for (const p of tutte) {
    const t = readFileSync(p, 'utf8');
    for (const { u, dove } of indirizzi(t, PAGINE.has(estensione(p)))) {
      if (u.startsWith('//')) { male(`indirizzo senza schema in ${rel(p)}`, `${u} — «//host» e' esterno e sfugge a tutto: qui non si scrive`); fuoriElenco++; continue; }
      if (diCasa(u)) continue;
      if (dove === 'link') {
        nLink++;
        if (!inElenco(u, CASA.linkAmmessi) && !inElenco(u, CASA.hostMediaAmmessi)) { male(`link esterno non dichiarato in ${rel(p)}`, u); fuoriElenco++; }
      } else if (dove === 'carico') {
        nCarico++;
        if (!inElenco(u, CASA.hostMediaAmmessi) && !inElenco(u, CASA.spazioNomi)) { male(`la pagina attinge da un host non dichiarato in ${rel(p)}`, u); fuoriElenco++; }
      } else {
        nTesto++;
        if (!inElenco(u, CASA.linkAmmessi) && !inElenco(u, CASA.hostMediaAmmessi) && !inElenco(u, CASA.spazioNomi)) { male(`indirizzo esterno non dichiarato in ${rel(p)}`, u); fuoriElenco++; }
      }
    }
  }
  if (!fuoriElenco) ok('indirizzi esterni: tutti dichiarati nel blocco CASA', `${nLink} cliccabili · ${nCarico} attinti dalla pagina · ${nTesto} nominati`);

  // la fonte su ogni scheda, DENTRO il blocco .fonte (non un link esterno qualunque piu' sotto)
  let senzaFonte = 0, schedeViste = 0;
  for (const cartella of CASA.schede) {
    const dir = join(CASA_DIR, cartella);
    if (!existsSync(dir)) continue;
    for (const p of html.filter(x => x.startsWith(dir + sep) && !(dirname(x) === dir && basename(x) === 'index.html'))) {
      schedeViste++;
      const blocco = readFileSync(p, 'utf8').match(/class=["']fonte["'][\s\S]*?<\/div>/i);
      if (!blocco || !/<a\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"'\s]+/i.test(blocco[0])) { male(`scheda senza fonte cliccabile: ${rel(p)}`, 'ogni scheda porta un blocco .fonte con dentro un link http(s)'); senzaFonte++; }
    }
  }
  if (!senzaFonte) ok('fonte: ogni scheda ne porta una cliccabile', `${schedeViste} schede in ${CASA.schede.filter(c => existsSync(join(CASA_DIR, c))).join(', ')}`);

  // l'indice della ricerca: c'e', e' JSON, sta sotto il tetto, ogni voce punta a una pagina vera
  {
    const f = join(CASA_DIR, CASA.ricerca.indice);
    let voci = null, guasti = 0;
    if (!existsSync(f)) { male(`ricerca: manca ${CASA.ricerca.indice}`, 'lo scrive scripts/genera-tutto.py'); guasti++; }
    else {
      try { voci = JSON.parse(readFileSync(f, 'utf8')); } catch (err) { male(`ricerca: ${CASA.ricerca.indice} non e' JSON`, String(err.message).slice(0, 80)); guasti++; }
    }
    if (Array.isArray(voci)) {
      if (voci.length > CASA.ricerca.tettoVoci) { male(`ricerca: ${voci.length} voci, oltre il tetto di ${CASA.ricerca.tettoVoci}`, 'il disegno «tutto in un JSON, filtro in pagina» e\' finito: si riprogetta, non si alza il tetto'); guasti++; }
      for (const v of voci) {
        if (!v.url || !existsSync(join(CASA_DIR, String(v.url).replace(/^\/+/, '')))) { male(`ricerca: voce ${v.tipo}-${v.id} punta a una pagina che non c'e'`, String(v.url)); guasti++; }
      }
      if (!guasti) ok('ricerca: indice sano', `${voci.length} voci · tetto ${CASA.ricerca.tettoVoci}`);
    }
  }

  // i pesi, e i formati che qui non entrano
  const tuttiIFile = (dir = CASA_DIR, out = []) => {
    for (const n of readdirSync(dir).sort()) {
      if (n === '.git' || n === 'node_modules') continue;
      const p = join(dir, n);
      statSync(p).isDirectory() ? tuttiIFile(p, out) : out.push(p);
    }
    return out;
  };
  const MB = b => `${(b / 1_000_000).toFixed(1)} MB`;
  let pesanti = 0, totale = 0; const perCartella = {};
  for (const p of tuttiIFile()) {
    const { size } = statSync(p); totale += size;
    if (CASA.pesi.estensioniVietate.includes(estensione(p))) { male(`formato che qui non entra: ${rel(p)}`, 'audio, video e master vivono FUORI da git: la cronologia di un repo pubblico e\' per sempre'); pesanti++; }
    if (size > CASA.pesi.tettoFile) { male(`file troppo pesante: ${rel(p)}`, `${MB(size)} > tetto ${MB(CASA.pesi.tettoFile)}`); pesanti++; }
    for (const c of Object.keys(CASA.pesi.cartelle)) if (rel(p).startsWith(c + '/')) perCartella[c] = (perCartella[c] ?? 0) + size;
  }
  for (const [c, tetto] of Object.entries(CASA.pesi.cartelle)) {
    if ((perCartella[c] ?? 0) > tetto) { male(`cartella troppo pesante: ${c}/`, `${MB(perCartella[c])} > tetto ${MB(tetto)}`); pesanti++; }
  }
  if (!pesanti) ok('pesi: nessun file sopra il tetto, nessun formato vietato', `${MB(totale)} in tutto · tetto ${MB(CASA.pesi.tettoFile)} a file`);

  // meta obbligatorie — nel sorgente vero, non nei commenti
  let metaMancanti = 0;
  for (const p of html) {
    const t = senzaCommenti(readFileSync(p, 'utf8'));
    const buchi = CASA.metaObbligatorie.filter(m => !m.re.test(t)).map(m => m.nome);
    if (buchi.length) { male(`meta mancanti in ${rel(p)}`, buchi.join(' · ')); metaMancanti++; }
  }
  if (!metaMancanti) ok(`meta: complete su tutte le pagine`, `${html.length} pagine × ${CASA.metaObbligatorie.length} controlli`);

  // niente cookie, niente tracker — nel sorgente (HTML e JS); la rete vera si guarda nel giro vivo
  let tracker = 0;
  for (const p of tutte.filter(x => PAGINE.has(estensione(x)) || ['.js', '.mjs'].includes(estensione(x)))) {
    const t = comeLetto(readFileSync(p, 'utf8'));
    for (const { re, perche } of CASA.tracciantiVietati) {
      if (re.test(t)) { male(`tracciante in ${rel(p)}`, perche); tracker++; }
    }
  }
  if (!tracker) ok('niente cookie e niente tracker nel sorgente: verificato, non dichiarato');

  // il movimento si puo' spegnere — in ogni file che ne contiene, e il freno non e' un commento
  let senzaRidotto = 0;
  for (const p of tutte.filter(x => PAGINE.has(estensione(x)) || ['.css', '.js', '.mjs'].includes(estensione(x)))) {
    const t = senzaCommenti(readFileSync(p, 'utf8'));
    if (/\b(?:animation|transition)(?:-[a-z]+)?\s*:|\.animate\(/.test(t) && !/@media[^{]*prefers-reduced-motion/.test(t)) {
      male(`movimento senza freno in ${rel(p)}`, 'ci sono animazioni ma nessun blocco @media (prefers-reduced-motion)');
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
  '.txt':'text/plain; charset=utf-8', '.json':'application/json', '.ico':'image/x-icon', '.pdf':'application/pdf' };

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
    res.writeHead(200, { 'content-type': TIPI[estensione(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, porta: srv.address().port })));
}

async function vivi(html) {
  if (!BROWSER) {
    male('controlli vivi NON eseguiti: nessun browser trovato',
         `sbordamenti, console, rete e cookie restano NON misurati. Cercato in ${CANDIDATI_BROWSER.length} posti (Mac, Linux, cache Playwright). ` +
         `Indica il tuo: COLLAUDO_BROWSER=/percorso/del/browser — o lancia --veloce, che dichiara di fare solo gli statici`);
    return;
  }

  const { srv, porta: portaWeb } = await servi();
  const origine = `http://127.0.0.1:${portaWeb}`;
  const indirizzo = p => `${origine}/${relative(CASA_DIR, p).split(sep).join('/')}`;
  const inElenco = (u, elenco) => elenco.some(a => u.toLowerCase().startsWith(a.toLowerCase()));

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

  let sbordi = 0, rumore = 0, fuoriCasa = 0, biscotti = 0, richieste = 0;
  for (const p of html) {
    const { targetId } = await b.manda('Target.createTarget', { url: 'about:blank' });
    const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
    const t = lista.find(x => x.id === targetId);
    const pg = cdp(t.webSocketDebuggerUrl); await pg.pronto;

    await pg.manda('Page.enable'); await pg.manda('Runtime.enable'); await pg.manda('Log.enable'); await pg.manda('Network.enable');

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

    // la rete VERA: ogni host che la pagina ha chiamato, comunque l'avesse scritto
    const chiamati = new Set();
    for (const e of pg.eventi.filter(e => e.method === 'Network.requestWillBeSent')) {
      const u = e.params.request.url; richieste++;
      if (u.startsWith(origine) || /^(?:data|about|blob|chrome):/.test(u)) continue;
      if (!inElenco(u, CASA.hostMediaAmmessi)) chiamati.add(u.split(/[?#]/)[0]);
    }
    for (const u of chiamati) { male(`la pagina ha chiamato fuori casa: ${rel(p)}`, u); fuoriCasa++; }

    // i cookie VERI, dopo aver caricato la pagina tre volte
    const { cookies } = await pg.manda('Network.getCookies', { urls: [indirizzo(p)] });
    if (cookies?.length) { male(`la pagina scrive cookie: ${rel(p)}`, cookies.map(c => c.name).join(' · ')); biscotti++; }

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
  if (!fuoriCasa) ok(`nessuna pagina chiama fuori casa`, `${richieste} richieste di rete viste, tutte verso l'origine${CASA.hostMediaAmmessi.length ? ' o gli host media dichiarati' : ''}`);
  if (!biscotti) ok(`nessuna pagina scrive cookie`, `misurato dopo il caricamento, non dichiarato`);
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
