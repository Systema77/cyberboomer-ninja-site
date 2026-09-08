#!/usr/bin/env python3
"""comune.py — il tronco condiviso dai generatori di cyberboomer.ninja.

Non si lancia: si importa. Qui sta quello che OGNI pagina generata ha in comune,
qualunque sia il suo tipo — la lezione oggi, la dispensa, l'ascolto e il verdetto
domani. I generatori dei singoli tipi importano da qui e ci mettono sopra il corpo.

COSA C'E'.
  · i percorsi della casa (SITO, DOMINIO)
  · LA SPINA DORSALE — i campi che ogni scheda ha, di qualunque tipo — e `valida()`
  · `carica()` — legge una cartella di sorgenti JSON, adatta, valida, e si ferma al primo errore
  · `e()`   — l'escaping di un testo che va dentro l'HTML
  · `ricco()` — il testo con la marcatura minima, e I DUE GRADI DI PROVENIENZA
  · `testa()` — il blocco <head> completo: meta, canonical, og:*, e IL FOGLIO DI STILE
  · FIRMA  — il piede di pagina delle schede

LO SCHEMA UNICO (dall'08/09). Ogni scheda, di ogni tipo, ha la stessa spina:

    tipo         uno di TIPI: lezione · dispensa · ascolto · verdetto
    id           il nome che finisce nell'indirizzo (per la lezione: il numero, «001»)
    titolo       il titolo, testo puro
    standfirst   la riga sotto il titolo (puo' portare marcatura, se e' di casa)
    data         AAAA-MM-GG — o null SOLO per le lezioni del formato v1, che non la
                 portano: l'adattatore non la inventa (vedi tipo_lezione.py)
    tag          un elenco di parole, anche vuoto
    provenienza  `casa` o `proposta` — decide come si legge la marcatura (sotto)
    fonte        {titolo, url http(s), chi, chi_corto} — SENZA, la scheda non esiste

e poi un CORPO per tipo, che il modulo del tipo conosce (tipo_lezione.py: le quattro
battute). La regola della fonte cliccabile, nata per le lezioni, vale per tutti perche'
sta nella spina e non nel tipo.

LE SEI LEZIONI ESISTENTI NON SI MIGRANO. Il loro JSON resta com'e' (formato v1:
`n` invece di `id`+`tipo`, niente data, niente tag, niente provenienza): un
adattatore in tipo_lezione.py lo legge e lo porta sulla spina. Riscrivere contenuto
che funziona per compiacere uno schema e' il modo classico di perderlo.

LA PROVENIENZA, che e' la vera difesa. Un testo arriva da uno di due posti:
  `casa`     lo abbiamo scritto noi. Puo' portare la marcatura minima — e SOLO
             quella: la allowlist qui sotto e' chiusa, misurata sul corpus
             dell'08/09 (strong, em, span.falso, a con href http/https). Un tag
             fuori dall'elenco non viene "ripulito": FERMA il generatore, perche'
             un tag sbagliato in un file nostro e' un errore da correggere, non
             da nascondere.
  `proposta` lo ha scritto qualcun altro (uno studente, un lettore). E' TESTO:
             escaping totale, marcatura mai, qualunque cosa contenga.
La sicurezza non sta nella furbizia del sanitizer: sta nel fatto che il testo di
terzi non entra mai nel grado che permette marcatura.

IL FOGLIO DI STILE E' UNO, `/stile.css`, linkato in assoluto. Fino all'08/09 il
generatore delle lezioni si portava dietro 120 righe di CSS in una costante, e
altre due copie vivevano in index.html e 404.html: tre vestiti che dovevano essere
lo stesso e non lo erano. Adesso il vestito e' un file, e i generatori non ne
sanno niente: sanno solo dove sta.

Nessuna dipendenza: solo la libreria standard.

— creato da JUDY, 2026-09-08
"""

import html
import json
import os
import re

QUI = os.path.dirname(os.path.abspath(__file__))
SITO = os.path.abspath(os.path.join(QUI, ".."))
DOMINIO = "https://cyberboomer.ninja"

FOGLIO = '<link rel="stylesheet" href="/stile.css">'

PROVENIENZE = ("casa", "proposta")
TIPI = ("lezione", "dispensa", "ascolto", "verdetto")
SPINA = ("tipo", "id", "titolo", "standfirst", "data", "tag", "provenienza", "fonte")
_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def valida(d):
    """I difetti di una scheda rispetto alla spina. Lista vuota = passa."""
    difetti = []
    for c in SPINA:
        if c not in d:
            difetti.append(f"manca «{c}»")
    if difetti:
        return difetti
    if d["tipo"] not in TIPI:
        difetti.append(f"tipo «{d['tipo']}» sconosciuto (uno di: {', '.join(TIPI)})")
    for c in ("id", "titolo", "standfirst"):
        if not isinstance(d[c], str) or not d[c].strip():
            difetti.append(f"«{c}» vuoto")
    if d["data"] is None:
        if d.get("_formato") != "lezione-v1":
            difetti.append("«data» manca (AAAA-MM-GG)")
    elif not isinstance(d["data"], str) or not _DATA.match(d["data"]):
        difetti.append(f"«data» non e' AAAA-MM-GG: {d['data']!r}")
    if not isinstance(d["tag"], list) or not all(isinstance(t, str) for t in d["tag"]):
        difetti.append("«tag» non e' un elenco di parole")
    if d["provenienza"] not in PROVENIENZE:
        difetti.append(f"«provenienza» deve essere una di: {', '.join(PROVENIENZE)}")
    f = d["fonte"] if isinstance(d["fonte"], dict) else {}
    if not str(f.get("url", "")).startswith("http"):
        difetti.append("la fonte non ha un URL cliccabile — "
                       "non si pubblicano affermazioni che il lettore non puo' controllare")
    for c in ("titolo", "chi", "chi_corto"):
        if not f.get(c):
            difetti.append(f"la fonte non ha «{c}»")
    return difetti


def carica(cartella, adatta=None):
    """Le sorgenti di una cartella, adattate e validate. Al primo difetto stampa
    file e motivo e torna None: una scheda storta ferma tutta la corsa, apposta."""
    if not os.path.isdir(cartella):
        return []
    schede = []
    for nome in sorted(os.listdir(cartella)):
        if not nome.endswith(".json"):
            continue
        with open(os.path.join(cartella, nome), encoding="utf-8") as fh:
            try:
                d = json.load(fh)
            except json.JSONDecodeError as err:
                print(f"✗ {nome}: JSON rotto — {err}")
                return None
        if adatta:
            d = adatta(d)
        difetti = valida(d)
        if difetti:
            print(f"✗ {nome}: " + " · ".join(difetti))
            return None
        d["_file"] = nome
        schede.append(d)
    return schede

# La marcatura ammessa nel grado `casa`: tag → {attributo → regola sul valore}.
# Chiusa. Per allargarla si aggiunge una riga QUI e si passa il banco (prova-ricco.py).
MARCATURA = {
    "strong": {},
    "em": {},
    "span": {"class": lambda v: v == "falso"},
    "a": {
        "href": lambda v: re.match(r"^https?://", v) is not None,
        "rel": lambda v: v and set(v.split()) <= {"noopener", "noreferrer", "nofollow", "me"},
        "target": lambda v: v == "_blank",
    },
}
# Gli attributi che DEVONO esserci: senza, il tag non e' quello che il corpus usa.
# (Il banco dell'08/09 ha trovato che `<a>` e `<span>` nudi passavano: «ogni attributo
# presente e' ammesso» era vero anche quando non ce n'era nessuno.)
OBBLIGATORI = {"a": {"href"}, "span": {"class"}}

_TAG = re.compile(r"<[^>]*>")
_APERTURA = re.compile(r'^<([a-z]+)((?:\s+[a-z-]+="[^"]*")*)\s*>$')
_ATTRIBUTO = re.compile(r'\s+([a-z-]+)="([^"]*)"')
_CHIUSURA = re.compile(r"^</([a-z]+)>$")


class MarcaturaVietata(ValueError):
    """Un tag fuori dalla allowlist in un testo di casa. Si corregge il JSON."""


def e(t):
    return html.escape(str(t), quote=True)


def piano(t):
    """Testo puro da un testo con marcatura: via i tag, sciolte le entita', un solo
    spazio fra le parole. Serve all'indice della ricerca, non alle pagine."""
    t = _TAG.sub(" ", str(t))
    return " ".join(html.unescape(t).split())


def _tag_ammesso(tag):
    m = _CHIUSURA.match(tag)
    if m:
        return m.group(1) in MARCATURA
    m = _APERTURA.match(tag)
    if not m or m.group(1) not in MARCATURA:
        return False
    regole = MARCATURA[m.group(1)]
    attributi = _ATTRIBUTO.findall(m.group(2))
    # quelli obbligatori ci devono essere; ogni attributo presente deve essere
    # previsto per quel tag E passare la sua regola
    if not OBBLIGATORI.get(m.group(1), set()) <= {nome for nome, _ in attributi}:
        return False
    return all(nome in regole and regole[nome](valore) for nome, valore in attributi)


def ricco(t, provenienza):
    """Il testo delle sorgenti, con la marcatura minima se e' di casa.

    casa     → i tag della allowlist passano come sono scritti; il primo tag fuori
               elenco alza MarcaturaVietata (il generatore si ferma e dice quale).
    proposta → escaping totale: e' testo di terzi, la marcatura non esiste.
    """
    t = str(t)
    if provenienza != "casa":
        return e(t)
    for tag in _TAG.findall(t):
        if not _tag_ammesso(tag):
            raise MarcaturaVietata(tag)
    return t


def testa(titolo, descrizione, url, og_tipo, og_titolo, og_descrizione, favicon):
    """Il <head> di una scheda. `titolo` e `descrizione` arrivano gia' con l'escaping
    fatto dal chiamante, come tutto il resto: qui si compone, non si pulisce."""
    return f"""<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titolo}</title>
<meta name="description" content="{descrizione}">
<link rel="icon" href="{favicon}" type="image/svg+xml">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_tipo}">
<meta property="og:title" content="{og_titolo}">
<meta property="og:description" content="{og_descrizione}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{DOMINIO}/og-image.png">
<meta property="og:site_name" content="Cyber Boomer">
<meta name="twitter:card" content="summary_large_image">
{FOGLIO}"""


FIRMA = """<footer class="firma">
  <p><a href="../index.html">cyberboomer.ninja</a> · la voce · SYSTEMA 77</p>
</footer>"""
