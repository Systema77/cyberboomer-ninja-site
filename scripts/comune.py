#!/usr/bin/env python3
"""comune.py — il tronco condiviso dai generatori di cyberboomer.ninja.

Non si lancia: si importa. Qui sta quello che OGNI pagina generata ha in comune,
qualunque sia il suo tipo — la lezione oggi, la dispensa, l'ascolto e il verdetto
domani. I generatori dei singoli tipi importano da qui e ci mettono sopra il corpo.

COSA C'E'.
  · i percorsi della casa (SITO, DOMINIO)
  · `e()`   — l'escaping di un testo che va dentro l'HTML
  · `testa()` — il blocco <head> completo: meta, canonical, og:*, e IL FOGLIO DI STILE
  · FIRMA  — il piede di pagina delle schede

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

QUI = os.path.dirname(os.path.abspath(__file__))
SITO = os.path.abspath(os.path.join(QUI, ".."))
DOMINIO = "https://cyberboomer.ninja"

FOGLIO = '<link rel="stylesheet" href="/stile.css">'


def e(t):
    return html.escape(str(t), quote=True)


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
