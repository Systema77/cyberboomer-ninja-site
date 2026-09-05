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
identica alle altre. Cambiare il vestito a tutte e' un `replace` in questo file.

LA REGOLA CHE LO SCRIPT FA RISPETTARE, e non e' burocrazia:
**nessuna lezione senza una FONTE PUBBLICA CLICCABILE.**
Il dojo parla di Meta e Google a gente che non ha modo di verificarci. Se non
c'e' un link a una pagina ufficiale o a stampa indipendente, la lezione non si
genera — e lo script si ferma dicendo quale manca. Si spiega, non si accusa:
la differenza fra le due cose e' esattamente quel link.

Nessuna dipendenza: solo la libreria standard.

— creato da FLUX, 2026-09-05
"""

import html
import json
import os
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
SITO = os.path.abspath(os.path.join(QUI, ".."))
SORGENTI = os.path.join(SITO, "lezioni", "_sorgenti")
USCITA = os.path.join(SITO, "lezioni")

CAMPI = ("n", "titolo", "standfirst", "trappola", "davvero", "mossa", "proverbio", "fonte")
BATTUTE = ("La trappola", "Cos'è successo davvero", "La mossa del ninja", "Il proverbio del Boomer")

# ————————————————————————————————— il vestito ————————————————————————————————

CSS = """
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root{
    /* La voce è BLU LINK su nero — direzione JUDY (AD), DA-JUDY-ninja-blu-link.md, 08/08.
       Il blu dei collegamenti ipertestuali portato al 2077: è internet-che-fu, il posto
       da cui il Boomer parla. */
    --bg-deep:    #0C0A0C;
    --bg-surface: #161216;
    --voice:      #5C7CFF;
    --voice-soft: rgba(92,124,255,.09);
    --text-hi:    #EFE6EB;
    --text-lo:    #A89DA4;
    --line:       #3B2E36;
    --font-mono:  'Courier Prime','Courier New','Lucida Console',monospace;
    --font-serif: 'Iowan Old Style','Palatino Linotype',Palatino,'Georgia',serif;
  }
  body{
    background:var(--bg-deep); color:var(--text-hi);
    font-family:var(--font-serif); line-height:1.7; min-height:100vh; overflow-x:hidden;
    /* la luce 2077 (JUDY, 05/09): riga al neon in cima e alba blu dal bordo alto. Ferma. */
    border-top:2px solid transparent;
    border-image:linear-gradient(90deg, var(--voice) 0%, rgba(92,124,255,.35) 55%, transparent 100%) 1;
    background-image:radial-gradient(60% 38% at 50% 0%, rgba(92,124,255,.10), transparent 70%);
    background-repeat:no-repeat;
  }
  body::before{
    content:''; position:fixed; inset:0; pointer-events:none; z-index:9998;
    background:radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%);
  }
  body::after{
    content:''; position:fixed; inset:0; pointer-events:none; z-index:9999; opacity:.04;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .wrap{ max-width:680px; margin:0 auto; padding:0 1.5rem; }
  .masthead{ padding:2.2rem 0 0; font-family:var(--font-mono); text-align:center; }
  .masthead a{
    color:var(--text-lo); text-decoration:none; font-size:.7rem;
    letter-spacing:.28em; text-transform:uppercase;
  }
  .masthead a:hover, .masthead a:focus-visible{ color:var(--voice); }
  header.lesson{ padding:3.2rem 0 2.4rem; text-align:center; border-bottom:1px solid var(--line); }
  .serial{
    font-family:var(--font-mono); font-size:.68rem; letter-spacing:.32em;
    text-transform:uppercase; color:var(--voice); margin-bottom:1rem;
  }
  h1{ font-size:clamp(1.6rem,5vw,2.4rem); line-height:1.25; font-weight:600; }
  .standfirst{ margin-top:1rem; color:var(--text-lo); font-size:1.02rem; }
  section.beat{ padding:2.6rem 0 0; }
  .beat-label{
    font-family:var(--font-mono); font-size:.68rem; letter-spacing:.3em;
    text-transform:uppercase; color:var(--voice); margin-bottom:1.1rem;
  }
  .beat-label .num{ opacity:.65; margin-right:.7em; }
  .prose{ color:var(--text-lo); }
  .prose p + p{ margin-top:1em; }
  .prose strong{ color:var(--text-hi); font-weight:600; }
  .prose em{ color:var(--text-hi); }
  .prose a{ color:var(--voice); text-decoration:none; border-bottom:1px solid var(--line); }
  .prose a:hover, .prose a:focus-visible{ border-color:var(--voice); }
  /* la scena ricostruita: un SMS, una schermata, un pulsante */
  .scena{
    margin:1.4rem 0 0; background:var(--bg-surface); border:1px solid var(--line);
    padding:1.1rem 1.3rem; font-family:var(--font-mono); font-size:.9rem;
    color:var(--text-hi); line-height:1.6;
  }
  .scena .from{
    display:block; font-size:.65rem; letter-spacing:.22em; text-transform:uppercase;
    color:var(--text-lo); margin-bottom:.5rem;
  }
  .scena .falso{ text-decoration:underline; }
  ol.moves{ list-style:none; counter-reset:mossa; margin-top:1.4rem; }
  ol.moves li{
    counter-increment:mossa; position:relative;
    background:var(--bg-surface); border:1px solid var(--line);
    padding:1.1rem 1.3rem 1.1rem 3.4rem; margin-bottom:.8rem; color:var(--text-lo);
  }
  ol.moves li::before{
    content:counter(mossa); position:absolute; left:1.1rem; top:1.05rem;
    font-family:var(--font-mono); font-weight:700; font-size:1.1rem; color:var(--voice);
  }
  ol.moves li strong{ color:var(--text-hi); }
  ol.moves li a{ color:var(--voice); text-decoration:none; border-bottom:1px solid var(--line); }
  ol.moves li a:hover, ol.moves li a:focus-visible{ border-color:var(--voice); }
  .proverbio{
    margin:3rem 0 0; padding:2rem 1.6rem; text-align:center;
    border-top:1px solid var(--voice); border-bottom:1px solid var(--voice);
    background:var(--voice-soft);
  }
  .proverbio .q{ font-size:clamp(1.15rem,3.4vw,1.5rem); line-height:1.5; font-style:italic; }
  .proverbio .who{
    margin-top:1rem; font-family:var(--font-mono); font-size:.68rem;
    letter-spacing:.28em; text-transform:uppercase; color:var(--text-lo);
  }
  /* la fonte: senza questa non si pubblica */
  .fonte{
    margin:2.6rem 0 0; border:1px solid var(--line); background:var(--bg-surface);
    padding:1.2rem 1.3rem;
  }
  .fonte .et{
    font-family:var(--font-mono); font-size:.62rem; letter-spacing:.26em;
    text-transform:uppercase; color:var(--voice); display:block; margin-bottom:.6rem;
  }
  .fonte a{ color:var(--text-hi); text-decoration:none; border-bottom:1px solid var(--voice); }
  .fonte a:hover, .fonte a:focus-visible{ color:var(--voice); }
  .fonte .chi{ display:block; margin-top:.5rem; font-size:.85rem; color:var(--text-lo); }
  .share{ margin-top:1.6rem; text-align:center; font-family:var(--font-mono); font-size:.8rem; }
  .share a{ color:var(--voice); text-decoration:none; border-bottom:1px solid var(--line); }
  .share a:hover, .share a:focus-visible{ border-color:var(--voice); }
  footer{
    margin-top:3.5rem; border-top:1px solid var(--line);
    padding:2.2rem 1.5rem 3rem; text-align:center;
    font-family:var(--font-mono); color:var(--text-lo); font-size:.72rem;
    letter-spacing:.18em; text-transform:uppercase;
  }
  footer a{ color:var(--voice); text-decoration:none; }
  footer a:hover, footer a:focus-visible{ border-bottom:1px solid var(--voice); }
"""

PAGINA = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITOLO__ — Lezione n.__N__ · Cyber Boomer</title>
<meta name="description" content="__DESC__">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="canonical" href="https://cyberboomer.ninja/lezioni/lezione-__N__.html">
<meta property="og:type" content="article">
<meta property="og:title" content="__TITOLO__ — Lezione n.__N__">
<meta property="og:description" content="__DESC__">
<meta property="og:url" content="https://cyberboomer.ninja/lezioni/lezione-__N__.html">
<meta property="og:image" content="https://cyberboomer.ninja/og-image.png">
<meta property="og:site_name" content="Cyber Boomer">
<meta name="twitter:card" content="summary_large_image">
<style>__CSS__</style>
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

<footer>
  <p><a href="../index.html">cyberboomer.ninja</a> · la voce · SYSTEMA 77</p>
</footer>

</body>
</html>
"""

INDICE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Il dojo — Lezioni dal 2077 · Cyber Boomer</title>
<meta name="description" content="Le lezioni del dojo: trappole digitali vere, spiegate in quattro battute. Ogni lezione ha una fonte pubblica che puoi controllare.">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="canonical" href="https://cyberboomer.ninja/lezioni/">
<meta property="og:type" content="website">
<meta property="og:title" content="Il dojo — Lezioni dal 2077">
<meta property="og:description" content="Trappole digitali vere, spiegate in quattro battute. Con la fonte, sempre.">
<meta property="og:url" content="https://cyberboomer.ninja/lezioni/">
<meta property="og:image" content="https://cyberboomer.ninja/og-image.png">
<meta property="og:site_name" content="Cyber Boomer">
<meta name="twitter:card" content="summary_large_image">
<style>__CSS__
  .intro{ padding:2.6rem 0 0; }
  .intro .prose{ color:var(--text-lo); }
  ul.lezioni{ list-style:none; margin:2rem 0 0; }
  ul.lezioni li{ margin-bottom:1rem; }
  ul.lezioni a{
    display:block; text-decoration:none; color:inherit;
    background:var(--bg-surface); border:1px solid var(--line);
    padding:1.3rem 1.4rem; transition:border-color .25s, background .25s, transform .25s;
  }
  ul.lezioni a:hover, ul.lezioni a:focus-visible{
    border-color:var(--voice); background:var(--voice-soft); transform:translateY(-2px);
  }
  ul.lezioni .n{
    font-family:var(--font-mono); font-size:.62rem; letter-spacing:.26em;
    text-transform:uppercase; color:var(--voice); display:block; margin-bottom:.45rem;
  }
  ul.lezioni .t{ font-size:1.12rem; color:var(--text-hi); display:block; margin-bottom:.4rem; }
  ul.lezioni .d{ font-size:.92rem; color:var(--text-lo); line-height:1.55; display:block; }
  ul.lezioni .f{
    display:block; margin-top:.8rem; font-family:var(--font-mono); font-size:.62rem;
    letter-spacing:.16em; text-transform:uppercase; color:var(--text-lo);
  }
  @media (prefers-reduced-motion: reduce){
    ul.lezioni a{ transition:none; }
    ul.lezioni a:hover, ul.lezioni a:focus-visible{ transform:none; }
  }
</style>
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

<footer>
  <p><a href="../index.html">cyberboomer.ninja</a> · la voce · SYSTEMA 77</p>
</footer>

</body>
</html>
"""


def e(t):
    return html.escape(str(t), quote=True)


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
        desc = e(d["standfirst"])
        pagina = (PAGINA
                  .replace("__CSS__", CSS)
                  .replace("__BATTUTE__", battute(d))
                  .replace("__TITOLO__", e(d["titolo"]))
                  .replace("__STANDFIRST__", ricco(d["standfirst"]))
                  .replace("__DESC__", desc)
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
            f'      <span class="t">{e(d["titolo"])}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"])}</span>\n'
            f'      <span class="f">Fonte: {e(d["fonte"]["chi_corto"])}</span>\n'
            f'    </a></li>')

    with open(os.path.join(USCITA, "index.html"), "w", encoding="utf-8") as f:
        f.write(INDICE.replace("__CSS__", CSS).replace("__VOCI__", "\n".join(voci)))

    print(f"✓ {len(lezioni)} lezioni + l'indice del dojo")
    for d in lezioni:
        print(f"  – n.{d['n']}  {d['titolo']}")
        print(f"           fonte: {d['fonte']['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
