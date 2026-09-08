#!/usr/bin/env python3
"""tipo_ascolto.py — il tipo ASCOLTO: l'audio sta FUORI da git, la trascrizione sta QUI.

Non si lancia: lo chiama genera-tutto.py. Le sorgenti stanno in `ascolti/_sorgenti/`.
Scrive:

    ascolti/<id>.html      la pagina: il lettore audio, i capitoli, TUTTA la trascrizione
    ascolti/index.html     l'indice, solo se c'e' almeno un ascolto

PERCHE' L'AUDIO NON ENTRA NEL REPO. Git non dimentica: un episodio da 60 MB
committato e tolto il giorno dopo resta scaricabile per sempre da un repo pubblico.
Il file vive su un host media che il guardiano deve conoscere (blocco CASA,
hostMediaAmmessi): finche' l'host non e' dichiarato, la pagina e' rossa. Qui si
pretende solo che l'indirizzo sia https e che il peso sia dichiarato, perche' il
generatore non scarica niente per misurarlo.

LA TRASCRIZIONE IN PAGINA E' LA DECISIONE CHE FA FUNZIONARE TUTTO: rende l'audio
archivio invece che flusso — cercabile, citabile, leggibile da chi non sente.
Senza trascrizione l'ascolto non si genera.

La cartella si chiama `ascolti/`, non «podcast»: la casa vieta il gergo non spiegato.

— creato da JUDY, 2026-09-08
"""

import os
import re

from comune import DOMINIO, FIRMA, SITO, MarcaturaVietata, e, piano, ricco, testa

SORGENTI = os.path.join(SITO, "ascolti", "_sorgenti")
USCITA = os.path.join(SITO, "ascolti")
FORMATI = ("mp3", "m4a", "ogg", "opus")
_TEMPO = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")

PAGINA = """<!DOCTYPE html>
<html lang="it">
<head>
__TESTA__
</head>
<body>

<nav class="masthead"><a href="index.html">← Gli ascolti · tutti</a></nav>

<div class="wrap">

  <header class="lesson">
    <p class="serial">Ascolto · __DATA__ · __DURATA__</p>
    <h1>__TITOLO__</h1>
    <p class="standfirst">__STANDFIRST__</p>
  </header>

  <div class="ascolto">
    <span class="et">✳ L'audio — __FORMATO__ · __PESO__ dichiarati · non parte da solo</span>
    <audio controls preload="none" src="__AUDIO__">
      Il tuo programma non sa suonare questo file:
      <a href="__AUDIO__" rel="noopener">scaricalo</a> e aprilo con un lettore qualunque.
    </audio>
    <span class="chi">Se preferisci leggere: la trascrizione completa è qui sotto, parola per parola.</span>
  </div>

__CAPITOLI__
  <section class="beat">
    <h2 class="beat-label"><span class="num">__N_TRASCRIZIONE__</span>La trascrizione</h2>
    <div class="prose trascrizione">
__TRASCRIZIONE__
    </div>
  </section>

  <div class="fonte">
    <span class="et">✳ La fonte — controlla tu</span>
    <a href="__FONTE_URL__" rel="noopener" target="_blank">__FONTE_TITOLO__</a>
    <span class="chi">__FONTE_CHI__</span>
  </div>

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
    <p class="serial">Gli ascolti</p>
    <h1>Il Boomer, a voce</h1>
    <p class="standfirst">Le stesse trappole, raccontate. Ogni ascolto ha la trascrizione
    intera in pagina: si può leggere, cercare, citare — anche senza sentire.</p>
  </header>

  <ul class="elenco">
__VOCI__
  </ul>

</div>

__FIRMA__

</body>
</html>
"""


def difetti_corpo(d):
    difetti = []
    a = d.get("audio") if isinstance(d.get("audio"), dict) else {}
    if not a:
        difetti.append("manca «audio» {url, formato, durata, peso_mb}")
    else:
        if not str(a.get("url", "")).startswith("https://"):
            difetti.append("«audio.url» deve essere https:// su un host dichiarato nel guardiano")
        if a.get("formato") not in FORMATI:
            difetti.append(f"«audio.formato» deve essere uno di: {', '.join(FORMATI)}")
        if not _TEMPO.match(str(a.get("durata", ""))):
            difetti.append("«audio.durata» e' mm:ss (o h:mm:ss)")
        if not isinstance(a.get("peso_mb"), (int, float)) or a["peso_mb"] <= 0:
            difetti.append("«audio.peso_mb» va dichiarato: il generatore non scarica niente per misurarlo")
    if not d.get("trascrizione") or not isinstance(d["trascrizione"], list):
        difetti.append("manca «trascrizione» (un elenco di paragrafi): senza, l'ascolto non e' archivio")
    for c in d.get("capitoli") or []:
        if not (isinstance(c, dict) and _TEMPO.match(str(c.get("tempo", ""))) and c.get("titolo")):
            difetti.append("ogni capitolo e' {tempo mm:ss, titolo}")
            break
    return difetti


def voce_archivio(d):
    return {
        "tipo": "ascolto", "id": d["id"], "url": f"/ascolti/{d['id']}.html",
        "titolo": d["titolo"], "standfirst": piano(d["standfirst"]),
        "tag": d["tag"], "data": d["data"],
        "testo": piano(" ".join(d["trascrizione"]) + " " + " ".join(c["titolo"] for c in d.get("capitoli") or [])),
    }


def genera(schede):
    """Scrive pagine e indice. Torna i percorsi scritti, o None se si ferma."""
    schede = sorted(schede, key=lambda d: (d["data"], d["id"]), reverse=True)
    scritti, voci = [], []
    if schede:
        os.makedirs(USCITA, exist_ok=True)
    for d in schede:
        mancanti = difetti_corpo(d)
        if mancanti:
            print(f"✗ {d['_file']}: " + " · ".join(mancanti))
            return None
        pr, a = d["provenienza"], d["audio"]
        titolo, desc = e(d["titolo"]), e(piano(d["standfirst"]))
        url = f"{DOMINIO}/ascolti/{d['id']}.html"
        capitoli = ""
        if d.get("capitoli"):
            righe = "\n".join(f'      <li><time>{e(c["tempo"])}</time> {ricco(c["titolo"], pr)}</li>' for c in d["capitoli"])
            capitoli = ('  <section class="beat">\n    <h2 class="beat-label"><span class="num">01</span>I capitoli</h2>\n'
                        f'    <ul class="crono">\n{righe}\n    </ul>\n  </section>\n\n')
        try:
            pagina = (PAGINA
                      .replace("__TESTA__", testa(f"{titolo} — Ascolto · Cyber Boomer", desc, url, "article",
                                                  f"{titolo} — Ascolto", desc, "../favicon.svg"))
                      .replace("__FIRMA__", FIRMA)
                      .replace("__CAPITOLI__", capitoli)
                      .replace("__N_TRASCRIZIONE__", "02" if capitoli else "01")
                      .replace("__TRASCRIZIONE__", "\n".join(f"      <p>{ricco(r, pr)}</p>" for r in d["trascrizione"]))
                      .replace("__TITOLO__", titolo)
                      .replace("__STANDFIRST__", ricco(d["standfirst"], pr))
                      .replace("__AUDIO__", e(a["url"]))
                      .replace("__FORMATO__", e(a["formato"]))
                      .replace("__PESO__", f'{a["peso_mb"]:g} MB')
                      .replace("__DURATA__", e(a["durata"]))
                      .replace("__FONTE_URL__", e(d["fonte"]["url"]))
                      .replace("__FONTE_TITOLO__", e(d["fonte"]["titolo"]))
                      .replace("__FONTE_CHI__", ricco(d["fonte"]["chi"], pr))
                      .replace("__DATA__", e(d["data"])))
        except MarcaturaVietata as tag:
            print(f"✗ {d['_file']}: marcatura fuori dalla allowlist: {tag}")
            return None
        dest = os.path.join(USCITA, f"{d['id']}.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(pagina)
        scritti.append(dest)
        voci.append(
            f'    <li data-voce="ascolto-{e(d["id"])}"><a href="{e(d["id"])}.html">\n'
            f'      <span class="n">Ascolto · {e(d["data"])} · {e(a["durata"])}</span>\n'
            f'      <span class="t">{titolo}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"], pr)}</span>\n'
            f'      <span class="f">{e(a["formato"])} · {a["peso_mb"]:g} MB · con trascrizione</span>\n'
            f'    </a></li>')

    if schede:
        indice = (INDICE
                  .replace("__TESTA__", testa(
                      "Gli ascolti — Il Boomer, a voce · Cyber Boomer",
                      "Le stesse trappole, raccontate a voce. Ogni ascolto ha la trascrizione intera in pagina "
                      "e una fonte pubblica che puoi controllare.",
                      f"{DOMINIO}/ascolti/", "website", "Gli ascolti — Il Boomer, a voce",
                      "Le stesse trappole, raccontate a voce. Con la trascrizione e la fonte, sempre.", "../favicon.svg"))
                  .replace("__FIRMA__", FIRMA)
                  .replace("__VOCI__", "\n".join(voci)))
        dest = os.path.join(USCITA, "index.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(indice)
        scritti.append(dest)
    return scritti
