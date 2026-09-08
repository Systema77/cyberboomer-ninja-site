#!/usr/bin/env python3
"""tipo_lezione.py — il tipo LEZIONE: l'adattatore del formato v1 e la forma delle pagine.

Non si lancia: lo chiama genera-tutto.py. Una lezione del dojo ha sempre la stessa
forma — quattro battute: LA TRAPPOLA · COS'E' SUCCESSO DAVVERO · LA MOSSA DEL NINJA
· IL PROVERBIO. Questo modulo prende una scheda sulla spina (vedi comune.py) col
corpo di una lezione e scrive:

    lezioni/lezione-NNN.html   una per scheda
    lezioni/index.html         l'indice del dojo, in ordine di numero

L'ADATTATORE (`adatta`). Le sei lezioni scritte fino all'08/09 stanno in
`lezioni/_sorgenti/*.json` nel formato v1: `n` invece di `id`, niente `tipo`,
niente `data`, niente `tag`, niente `provenienza`. NON si migrano: l'adattatore
le porta sulla spina al volo, senza toccare il file. Cosa mette e perche':

    tipo         «lezione» — e' quello che sono
    id           n         — il numero e' gia' il nome nell'indirizzo
    data         None      — il v1 non la porta e NON si inventa; la spina lo
                             permette solo per questo formato (_formato: lezione-v1)
    tag          []        — nessuno: un elenco vuoto e' un fatto, non una stima
    provenienza  «casa»    — le ha scritte la casa, tutte e sei

La prova che l'adattatore non altera niente: le sei pagine e l'indice escono
BYTE-IDENTICI a quelli generati prima che esistesse (misurato l'08/09).

— creato da FLUX, 2026-09-05 (come genera-lezione.py) · riorganizzato da JUDY, 2026-09-08
"""

import os

from comune import DOMINIO, FIRMA, SITO, MarcaturaVietata, e, ricco, testa

SORGENTI = os.path.join(SITO, "lezioni", "_sorgenti")
USCITA = os.path.join(SITO, "lezioni")

CORPO = ("trappola", "davvero", "mossa", "proverbio")
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


# ————————————————————————————————— l'adattatore ————————————————————————————————

def adatta(d):
    """Formato v1 → spina. Se il file ha gia' `tipo`, e' gia' sulla spina: passa."""
    if "tipo" in d:
        return d
    s = {
        "tipo": "lezione",
        "id": d.get("n"),
        "titolo": d.get("titolo"),
        "standfirst": d.get("standfirst"),
        "data": None,
        "tag": [],
        "provenienza": "casa",
        "fonte": d.get("fonte"),
        "_formato": "lezione-v1",
    }
    for c in CORPO + ("x_aperto",):
        if c in d:
            s[c] = d[c]
    return s


def difetti_corpo(d):
    """Cio' che una lezione deve avere oltre alla spina."""
    return [f"manca «{c}»" for c in CORPO if not d.get(c)]


# ————————————————————————————————— il corpo ————————————————————————————————

def prosa(righe, pr):
    return "\n".join(f"      <p>{ricco(r, pr)}</p>" for r in righe)


def scena(sc, pr):
    if not sc:
        return ""
    da = f'      <span class="from">{e(sc["da"])}</span>\n' if sc.get("da") else ""
    return (f'    <div class="scena" role="img" aria-label="{e(sc.get("alt", "Ricostruzione"))}">\n'
            f'{da}      {ricco(sc["testo"], pr)}\n    </div>\n')


def battute(d, pr):
    fuori = []

    # 01 · la trappola
    corpo = f'    <div class="prose">\n{prosa(d["trappola"]["prosa"], pr)}\n    </div>\n'
    corpo += scena(d["trappola"].get("scena"), pr)
    if d["trappola"].get("dopo"):
        corpo += f'    <div class="prose">\n{prosa(d["trappola"]["dopo"], pr)}\n    </div>\n'
    fuori.append((BATTUTE[0], corpo))

    # 02 · cos'e' successo davvero
    fuori.append((BATTUTE[1],
                  f'    <div class="prose">\n{prosa(d["davvero"]["prosa"], pr)}\n    </div>\n'))

    # 03 · la mossa del ninja
    passi = "\n".join(
        f'      <li><strong>{ricco(p["forte"], pr)}</strong> {ricco(p["testo"], pr)}</li>'
        for p in d["mossa"]["passi"])
    intro = ""
    if d["mossa"].get("intro"):
        intro = f'    <div class="prose">\n{prosa(d["mossa"]["intro"], pr)}\n    </div>\n'
    fuori.append((BATTUTE[2], intro + f'    <ol class="moves">\n{passi}\n    </ol>\n'))

    # 04 · il proverbio
    pv = d["proverbio"]
    fuori.append((BATTUTE[3],
                  '    <figure class="proverbio">\n'
                  f'      <blockquote class="q">«{ricco(pv["testo"], pr)}»</blockquote>\n'
                  f'      <figcaption class="who">— Cyber Boomer, lezione n.{e(d["id"])}</figcaption>\n'
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


# ————————————————————————————————— la corsa ————————————————————————————————

def genera(schede):
    """Scrive le pagine e l'indice. Torna i percorsi scritti, o None se si ferma."""
    schede = sorted(schede, key=lambda d: d["id"])
    scritti, voci = [], []

    for d in schede:
        mancanti = difetti_corpo(d)
        if mancanti:
            print(f"✗ {d['_file']}: " + " · ".join(mancanti))
            return None
        n = e(d["id"])
        titolo = e(d["titolo"])
        desc = e(d["standfirst"])
        url = f"{DOMINIO}/lezioni/lezione-{n}.html"
        pr = d["provenienza"]
        try:
            pagina = (PAGINA
                      .replace("__TESTA__", testa(f"{titolo} — Lezione n.{n} · Cyber Boomer", desc, url,
                                                  "article", f"{titolo} — Lezione n.{n}", desc,
                                                  "../favicon.svg"))
                      .replace("__FIRMA__", FIRMA)
                      .replace("__BATTUTE__", battute(d, pr))
                      .replace("__TITOLO__", titolo)
                      .replace("__STANDFIRST__", ricco(d["standfirst"], pr))
                      .replace("__FONTE_URL__", e(d["fonte"]["url"]))
                      .replace("__FONTE_TITOLO__", e(d["fonte"]["titolo"]))
                      .replace("__FONTE_CHI__", ricco(d["fonte"]["chi"], pr))
                      .replace("__SHARE__", share(d.get("x_aperto", False)))
                      .replace("__N__", n))
        except MarcaturaVietata as tag:
            print(f"✗ {d['_file']}: marcatura fuori dalla allowlist: {tag}\n"
                  f"  Nei testi di casa passano solo strong, em, span.falso e a con href http(s). "
                  f"Si corregge il JSON, non si allarga la lista.")
            return None
        dest = os.path.join(USCITA, f"lezione-{d['id']}.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(pagina)
        scritti.append(dest)

        voci.append(
            f'    <li><a href="lezione-{n}.html">\n'
            f'      <span class="n">Lezione n.{n}</span>\n'
            f'      <span class="t">{titolo}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"], pr)}</span>\n'
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
    dest = os.path.join(USCITA, "index.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(indice)
    scritti.append(dest)
    return scritti
