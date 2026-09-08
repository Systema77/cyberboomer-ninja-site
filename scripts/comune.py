#!/usr/bin/env python3
"""comune.py — il tronco condiviso dai generatori di cyberboomer.ninja.

Non si lancia: si importa. Qui sta quello che OGNI pagina generata ha in comune,
qualunque sia il suo tipo — la lezione oggi, la dispensa, l'ascolto e il verdetto
domani. I generatori dei singoli tipi importano da qui e ci mettono sopra il corpo.

COSA C'E'.
  · i percorsi della casa (SITO, DOMINIO)
  · `e()`   — l'escaping di un testo che va dentro l'HTML
  · `ricco()` — il testo con la marcatura minima, e I DUE GRADI DI PROVENIENZA
  · `testa()` — il blocco <head> completo: meta, canonical, og:*, e IL FOGLIO DI STILE
  · FIRMA  — il piede di pagina delle schede

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
import os
import re

QUI = os.path.dirname(os.path.abspath(__file__))
SITO = os.path.abspath(os.path.join(QUI, ".."))
DOMINIO = "https://cyberboomer.ninja"

FOGLIO = '<link rel="stylesheet" href="/stile.css">'

PROVENIENZE = ("casa", "proposta")

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
