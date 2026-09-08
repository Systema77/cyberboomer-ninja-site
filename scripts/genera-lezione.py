#!/usr/bin/env python3
"""genera-lezione.py — il motore del DOJO di cyberboomer.ninja.

    python3 scripts/genera-lezione.py

COS'E'. Una lezione del dojo ha sempre la stessa forma — quattro battute:
LA TRAPPOLA · COS'E' SUCCESSO DAVVERO · LA MOSSA DEL NINJA · IL PROVERBIO.
Questo script prende il CONTENUTO (un file JSON per lezione, in
`lezioni/_sorgenti/`) e ci mette sopra LA FORMA. Scrive:

    lezioni/lezione-NNN.html   una per sorgente
    lezioni/index.html         l'indice del dojo, in ordine di numero

PERCHE' UN GENERATORE E NON PAGINE SCRITTE A MANO. La lezione n.001 era stata
scritta a mano il 02/08 e per un mese e' rimasta sola: ogni lezione nuova voleva
ricopiare 200 righe di CSS e sperare di non sbagliarne una. Cosi' il dojo non e'
un raccoglitore di pagine, e' una macchina: si scrive un JSON e la lezione esiste,
identica alle altre. Il vestito non sta piu' qui: sta in `/stile.css`, uno per
tutta la casa (dall'08/09) — cambiare il vestito a tutte e' un `replace` la'.

LA REGOLA CHE LO SCRIPT FA RISPETTARE, e non e' burocrazia:
**nessuna lezione senza una FONTE PUBBLICA CLICCABILE.**
Il dojo parla di Meta e Google a gente che non ha modo di verificarci. Se non
c'e' un link a una pagina ufficiale o a stampa indipendente, la lezione non si
genera — e lo script si ferma dicendo quale manca. Si spiega, non si accusa:
la differenza fra le due cose e' esattamente quel link.

Nessuna dipendenza: solo la libreria standard.

— creato da FLUX, 2026-09-05
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import DOMINIO, FIRMA, SITO, e, testa  # noqa: E402

SORGENTI = os.path.join(SITO, "lezioni", "_sorgenti")
USCITA = os.path.join(SITO, "lezioni")

CAMPI = ("n", "titolo", "standfirst", "trappola", "davvero", "mossa", "proverbio", "fonte")
BATTUTE = ("La trappola", "Cos'è successo davvero", "La mossa del ninja", "Il proverbio del Boomer")

# ————————————————————————————————— la forma ————————————————————————————————

PAGINA = """<!DOCTYPE html>
<html lang="it">
<head>
__TESTA__
</head>
<body>

<nav class="masthead"><a href="index.html">← Il dojo · tutte le lezioni</a></nav>

<div class="wrap">

  <header class="lesson">
    <p class="serial">Lezione dal 2077 · n.__N__</p>
    <h1>__TITOLO__</h1>
    <p class="standfirst">__STANDFIRST__</p>
  </header>

__BATTUTE__

  <div class="fonte">
    <span class="et">✳ La fonte — controlla tu</span>
    <a href="__FONTE_URL__" rel="noopener" target="_blank">__FONTE_TITOLO__</a>
    <span class="chi">__FONTE_CHI__</span>
  </div>

  <p class="share">✳ Portalo in giro: __SHARE__</p>

</div>

__FIRMA__

</body>
</html>
"""

INDICE = """<!DOCTYPE html>
<html lang="it">
<head>
__TESTA__
</head>
<body>

<nav class="masthead"><a href="../index.html">← Cyber Boomer · la voce</a></nav>

<div class="wrap">

  <header class="lesson">
    <p class="serial">Il dojo</p>
    <h1>Lezioni dal 2077</h1>
    <p class="standfirst">Una trappola vera per volta, in quattro battute.
    Si entra spaventati, si esce ridendo — e molto più difficili da fregare.</p>
  </header>

  <section class="intro">
    <div class="prose">
      <p><strong>Ogni lezione ha una fonte pubblica cliccabile.</strong> Non perché sia
      elegante: perché qui si parla di aziende grandi come nazioni, e una cosa detta
      senza fonte è una chiacchiera da bar. <em>Controlla tu.</em></p>
    </div>
  </section>

  <ul class="lezioni">
__VOCI__
  </ul>

</div>

__FIRMA__

</body>
</html>
"""


def ricco(t):
    """Il testo delle sorgenti puo' contenere <strong> <em> <a>: si scrive nel JSON
    come marcatura minima e si fida — le sorgenti le scriviamo noi, non il pubblico."""
    return str(t)


def prosa(righe):
    return "\n".join(f"      <p>{ricco(r)}</p>" for r in righe)


def scena(sc):
    if not sc:
        return ""
    da = f'      <span class="from">{e(sc["da"])}</span>\n' if sc.get("da") else ""
    return (f'    <div class="scena" role="img" aria-label="{e(sc.get("alt", "Ricostruzione"))}">\n'
            f'{da}      {ricco(sc["testo"])}\n    </div>\n')


def battute(d):
    fuori = []

    # 01 · la trappola
    corpo = f'    <div class="prose">\n{prosa(d["trappola"]["prosa"])}\n    </div>\n'
    corpo += scena(d["trappola"].get("scena"))
    if d["trappola"].get("dopo"):
        corpo += f'    <div class="prose">\n{prosa(d["trappola"]["dopo"])}\n    </div>\n'
    fuori.append((BATTUTE[0], corpo))

    # 02 · cos'e' successo davvero
    fuori.append((BATTUTE[1],
                  f'    <div class="prose">\n{prosa(d["davvero"]["prosa"])}\n    </div>\n'))

    # 03 · la mossa del ninja
    passi = "\n".join(
        f'      <li><strong>{ricco(p["forte"])}</strong> {ricco(p["testo"])}</li>'
        for p in d["mossa"]["passi"])
    intro = ""
    if d["mossa"].get("intro"):
        intro = f'    <div class="prose">\n{prosa(d["mossa"]["intro"])}\n    </div>\n'
    fuori.append((BATTUTE[2], intro + f'    <ol class="moves">\n{passi}\n    </ol>\n'))

    # 04 · il proverbio
    pv = d["proverbio"]
    fuori.append((BATTUTE[3],
                  '    <figure class="proverbio">\n'
                  f'      <blockquote class="q">«{ricco(pv["testo"])}»</blockquote>\n'
                  f'      <figcaption class="who">— Cyber Boomer, lezione n.{e(d["n"])}</figcaption>\n'
                  '    </figure>\n'))

    return "\n".join(
        f'  <section class="beat">\n'
        f'    <h2 class="beat-label"><span class="num">{i + 1:02d}</span>{e(t)}</h2>\n'
        f'{c}  </section>\n'
        for i, (t, c) in enumerate(fuori))


def share(x_aperto):
    """Il ponte verso X esiste solo se l'account e' aperto e verificato.
    Finche' non lo e', non si promette un posto che non c'e'."""
    if x_aperto:
        return ('<a href="https://x.com/cyberboomer" rel="me noopener" target="_blank">'
                '@cyberboomer</a>')
    return 'raccontalo a voce a qualcuno che ci sarebbe cascato. <em>Funziona meglio del retweet.</em>'


def carica():
    if not os.path.isdir(SORGENTI):
        print(f"✗ manca {os.path.relpath(SORGENTI, SITO)}", file=sys.stderr)
        return None
    lezioni = []
    for nome in sorted(os.listdir(SORGENTI)):
        if not nome.endswith(".json"):
            continue
        percorso = os.path.join(SORGENTI, nome)
        with open(percorso, encoding="utf-8") as f:
            try:
                d = json.load(f)
            except json.JSONDecodeError as err:
                print(f"✗ {nome}: JSON rotto — {err}", file=sys.stderr)
                return None
        mancanti = [c for c in CAMPI if not d.get(c)]
        if mancanti:
            print(f"✗ {nome}: mancano {', '.join(mancanti)}", file=sys.stderr)
            return None
        # LA REGOLA: nessuna lezione senza fonte cliccabile
        url = (d.get("fonte") or {}).get("url", "")
        if not url.startswith("http"):
            print(f"✗ {nome}: la fonte non ha un URL cliccabile. "
                  f"Il dojo non pubblica affermazioni che il lettore non può controllare.",
                  file=sys.stderr)
            return None
        d["_file"] = nome
        lezioni.append(d)
    return lezioni


def main():
    lezioni = carica()
    if lezioni is None:
        return 1
    if not lezioni:
        print("✗ nessuna sorgente in lezioni/_sorgenti/", file=sys.stderr)
        return 1

    lezioni.sort(key=lambda d: d["n"])
    voci = []

    for d in lezioni:
        n = e(d["n"])
        titolo = e(d["titolo"])
        desc = e(d["standfirst"])
        url = f"{DOMINIO}/lezioni/lezione-{n}.html"
        pagina = (PAGINA
                  .replace("__TESTA__", testa(f"{titolo} — Lezione n.{n} · Cyber Boomer", desc, url,
                                              "article", f"{titolo} — Lezione n.{n}", desc,
                                              "../favicon.svg"))
                  .replace("__FIRMA__", FIRMA)
                  .replace("__BATTUTE__", battute(d))
                  .replace("__TITOLO__", titolo)
                  .replace("__STANDFIRST__", ricco(d["standfirst"]))
                  .replace("__FONTE_URL__", e(d["fonte"]["url"]))
                  .replace("__FONTE_TITOLO__", e(d["fonte"]["titolo"]))
                  .replace("__FONTE_CHI__", ricco(d["fonte"]["chi"]))
                  .replace("__SHARE__", share(d.get("x_aperto", False)))
                  .replace("__N__", n))
        dest = os.path.join(USCITA, f"lezione-{d['n']}.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(pagina)

        voci.append(
            f'    <li><a href="lezione-{n}.html">\n'
            f'      <span class="n">Lezione n.{n}</span>\n'
            f'      <span class="t">{titolo}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"])}</span>\n'
            f'      <span class="f">Fonte: {e(d["fonte"]["chi_corto"])}</span>\n'
            f'    </a></li>')

    indice = (INDICE
              .replace("__TESTA__", testa(
                  "Il dojo — Lezioni dal 2077 · Cyber Boomer",
                  "Le lezioni del dojo: trappole digitali vere, spiegate in quattro battute. "
                  "Ogni lezione ha una fonte pubblica che puoi controllare.",
                  f"{DOMINIO}/lezioni/", "website", "Il dojo — Lezioni dal 2077",
                  "Trappole digitali vere, spiegate in quattro battute. Con la fonte, sempre.",
                  "../favicon.svg"))
              .replace("__FIRMA__", FIRMA)
              .replace("__VOCI__", "\n".join(voci)))
    with open(os.path.join(USCITA, "index.html"), "w", encoding="utf-8") as f:
        f.write(indice)

    print(f"✓ {len(lezioni)} lezioni + l'indice del dojo")
    for d in lezioni:
        print(f"  – n.{d['n']}  {d['titolo']}")
        print(f"           fonte: {d['fonte']['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
