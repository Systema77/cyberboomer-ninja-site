#!/usr/bin/env python3
"""prova-ricco.py — il banco dei casi cattivi per `ricco()` di comune.py.

    python3 scripts/prova-ricco.py

Un sanitizer si collauda con l'input di chi vuole passare, non con quello di chi
si comporta bene. Qui ci sono tre banchi:

  ① CASA, deve passare COM'E'     la marcatura minima che le sorgenti usano davvero
  ② CASA, deve FERMARE            tutto cio' che non e' nella allowlist — script,
                                  attributi-evento, href non http, tag maiuscoli,
                                  virgolette singole, un `<` nudo nel testo, un tag
                                  aperto e mai chiuso, una `&` nuda
  ③ PROPOSTA, esce sempre TESTO   anche la marcatura ammessa in casa: per un terzo
                                  <strong> e' quattro caratteri, non un comando

Esce 1 se anche un solo caso non fa quello che deve. Si lancia prima di allargare
la allowlist e ogni volta che si tocca `ricco()`.

— creato da JUDY, 2026-09-08
"""

import html
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import MarcaturaVietata, ricco  # noqa: E402

PASSANO = [
    "testo semplice, con l'apostrofo e le «virgolette» e la é",
    "<strong>forte</strong> e <em>corsivo</em>",
    'un link: <span class="falso">dhll-riconsegna-24.top</span>',
    '<a href="https://takeout.google.com/" rel="noopener" target="_blank">Takeout</a>',
    '<a href="http://esempio.it/">http nudo, ma cliccabile</a>',
    '<a href="https://x/" rel="noopener noreferrer">due rel</a>',
    "due righe\n      con l'a capo dentro",
    "3 &lt; 5 scritto bene",
    "AT&amp;T &copy; 2077 &#8217; &#x2019; — entita' vere",
    "un > da solo va bene, e <em>a <strong>b</strong> c</em> e' annidato bene",
]

FERMANO = [
    "<script>alert(1)</script>",
    "<SCRIPT>maiuscolo</SCRIPT>",
    '<img src="x" onerror="alert(1)">',
    '<a href="javascript:alert(1)">clic</a>',
    '<a href="https://x/" onclick="rubami()">clic</a>',
    '<a href="https://x/" rel="opener">rel fuori elenco</a>',
    '<a href="https://x/" target="_self">target fuori elenco</a>',
    "<a href='https://x/'>virgolette singole</a>",
    '<a href="//x/">protocollo relativo</a>',
    '<a href="mailto:qualcuno@x">posta</a>',
    "<a>senza href</a>",
    '<strong onmouseover="x()">forte</strong>',
    '<em style="color:red">stile in linea</em>',
    '<span class="altro">classe fuori elenco</span>',
    "<span>span nudo</span>",
    "<b>grassetto vecchio</b>",
    "<br>",
    "<iframe src=\"https://x/\"></iframe>",
    "<svg onload=\"x()\"></svg>",
    "un < nudo e poi un > dopo",
    "<strong>aperto e <em>mescolato</strong> male</em> con <u>u</u>",
    # trovati dalla revisione dell'08/09: passavano, e nel DOM facevano danno
    "a <script src=https://evil.example/x.js e poi",     # il browser si prende il primo > a valle: <script> vero
    "prezzo <a",                                          # idem, tag monco
    "<!-- tutto il resto sparisce",                       # commento mai chiuso: la pagina si tronca
    '<a href="https://evil.example/">tutto link da qui',  # aperto e mai chiuso: il resto della pagina e' cliccabile
    "<strong>tutto grassetto da qui",
    "</strong> orfano",
    "<strong>a <em>b</strong> c</em>",                    # chiusure nell'ordine sbagliato
    '<a href="https://">host vuoto</a>',
    '<a href="https://admin:pass@x.example/">credenziali</a>',
    "AT&T &copy 2077",                                    # & nuda ed entita' senza ; cambiano il testo
]


def main():
    errori = 0

    print("① casa — passano com'e'")
    for t in PASSANO:
        try:
            fuori = ricco(t, "casa")
            stato = "ok" if fuori == t else "CAMBIATO"
        except MarcaturaVietata as err:
            stato, fuori = f"FERMATO ({err})", None
        if stato != "ok":
            errori += 1
        print(f"  {'✓' if stato == 'ok' else '✗'} {t[:60]!r} → {stato}")

    print("② casa — fermano")
    for t in FERMANO:
        try:
            fuori = ricco(t, "casa")
            stato = f"PASSATO: {fuori[:50]!r}"
            errori += 1
        except MarcaturaVietata as err:
            stato = f"fermato su {str(err)[:40]!r}"
        print(f"  {'✓' if stato.startswith('fermato') else '✗'} {t[:60]!r} → {stato}")

    print("③ proposta — esce sempre testo")
    for t in PASSANO + FERMANO:
        fuori = ricco(t, "proposta")
        atteso = html.escape(t, quote=True)
        bene = fuori == atteso and "<" not in fuori and ">" not in fuori
        if not bene:
            errori += 1
        print(f"  {'✓' if bene else '✗'} {t[:60]!r} → {fuori[:50]!r}")

    print(f"\n{'✓' if not errori else '✗'} {len(PASSANO) + len(FERMANO) * 2 + len(PASSANO)} casi · {errori} sbagliati")
    return 1 if errori else 0


if __name__ == "__main__":
    sys.exit(main())
