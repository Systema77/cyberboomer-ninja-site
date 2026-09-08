#!/usr/bin/env python3
"""tipo_dispensa.py — il tipo DISPENSA: un PDF nel repo, con una SCHEDA davanti.

Non si lancia: lo chiama genera-tutto.py. Le sorgenti stanno in `dispense/_sorgenti/`,
i file in `dispense/file/<nome>.pdf`. Scrive:

    dispense/<id>.html     la scheda: cosa c'e' dentro, quanto pesa, il link
    dispense/index.html    l'indice, solo se c'e' almeno una dispensa

LA PAGINA E' UNA SCHEDA, NON UN VISORE. Mai <embed>, mai <iframe>: il lettore vede
il peso PRIMA di cliccare (misurato dal file, non dichiarato a mano) e decide lui.
Una versione nuova e' un file nuovo (`-v2`), non una sovrascrittura: chi ha citato
l'indirizzo vecchio continua a trovare la cosa che ha citato.

Il guardiano tiene i tetti (4 MB a file, 200 MB la cartella); qui si dice prima,
col nome del file, cosi' chi sbaglia lo sa dal generatore e non dal collaudo.

— creato da JUDY, 2026-09-08
"""

import os

from comune import DOMINIO, FIRMA, SITO, MarcaturaVietata, e, piano, ricco, testa

SORGENTI = os.path.join(SITO, "dispense", "_sorgenti")
FILE = os.path.join(SITO, "dispense", "file")
USCITA = os.path.join(SITO, "dispense")
TETTO = 4 * 1024 * 1024

PAGINA = """<!DOCTYPE html>
<html lang="it">
<head>
__TESTA__
</head>
<body>

<nav class="masthead"><a href="index.html">← Le dispense · tutte</a></nav>

<div class="wrap">

  <header class="lesson">
    <p class="serial">Dispensa · __DATA__</p>
    <h1>__TITOLO__</h1>
    <p class="standfirst">__STANDFIRST__</p>
  </header>

  <div class="scheda-file">
    <span class="et">✳ Il file</span>
    <a href="file/__FILE__" rel="noopener" target="_blank">Apri la dispensa</a>
    <span class="chi">PDF · __PESO____PAGINE__ · si apre in una scheda nuova, niente da installare</span>
  </div>

  <section class="beat">
    <h2 class="beat-label"><span class="num">01</span>Cosa c'è dentro</h2>
    <div class="prose">
__SOMMARIO__
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
    <p class="serial">Le dispense</p>
    <h1>Da stampare e tenere vicino</h1>
    <p class="standfirst">Fogli da leggere con calma, da stampare, da lasciare sul tavolo
    di qualcuno. Ognuno dice quanto pesa prima che tu lo apra.</p>
  </header>

  <ul class="elenco">
__VOCI__
  </ul>

</div>

__FIRMA__

</body>
</html>
"""


def peso(byte):
    return f"{max(1, round(byte / 1024))} KB" if byte < 1024 * 1024 else f"{byte / 1024 / 1024:.1f} MB"


def difetti_corpo(d):
    difetti = []
    nome = str(d.get("file") or "")
    if not nome:
        difetti.append("manca «file» (il nome del PDF in dispense/file/)")
    elif "/" in nome or not nome.lower().endswith(".pdf"):
        difetti.append("«file» deve essere il solo nome di un .pdf dentro dispense/file/")
    else:
        p = os.path.join(FILE, nome)
        if not os.path.isfile(p):
            difetti.append(f"dispense/file/{nome} non c'e'")
        else:
            with open(p, "rb") as fh:
                if fh.read(5) != b"%PDF-":
                    difetti.append(f"dispense/file/{nome} non e' un PDF (non comincia con %PDF-)")
            if os.path.getsize(p) > TETTO:
                difetti.append(f"dispense/file/{nome} pesa {peso(os.path.getsize(p))}: il tetto e' {peso(TETTO)}")
    if not d.get("sommario") or not isinstance(d["sommario"], list):
        difetti.append("manca «sommario» (un elenco di paragrafi)")
    if "pagine" in d and (not isinstance(d["pagine"], int) or d["pagine"] <= 0):
        difetti.append("«pagine», se c'e', e' un intero positivo")
    return difetti


def voce_archivio(d):
    return {
        "tipo": "dispensa", "id": d["id"], "url": f"/dispense/{d['id']}.html",
        "titolo": d["titolo"], "standfirst": piano(d["standfirst"]),
        "tag": d["tag"], "data": d["data"], "testo": piano(" ".join(d["sommario"])),
    }


def genera(schede):
    """Scrive schede e indice. Torna i percorsi scritti, o None se si ferma."""
    schede = sorted(schede, key=lambda d: (d["data"], d["id"]), reverse=True)
    scritti, voci = [], []
    if schede:
        os.makedirs(USCITA, exist_ok=True)
    for d in schede:
        mancanti = difetti_corpo(d)
        if mancanti:
            print(f"✗ {d['_file']}: " + " · ".join(mancanti))
            return None
        pr = d["provenienza"]
        byte = os.path.getsize(os.path.join(FILE, d["file"]))
        titolo, desc = e(d["titolo"]), e(piano(d["standfirst"]))
        url = f"{DOMINIO}/dispense/{d['id']}.html"
        try:
            pagina = (PAGINA
                      .replace("__TESTA__", testa(f"{titolo} — Dispensa · Cyber Boomer", desc, url, "article",
                                                  f"{titolo} — Dispensa", desc, "../favicon.svg"))
                      .replace("__FIRMA__", FIRMA)
                      .replace("__SOMMARIO__", "\n".join(f"      <p>{ricco(r, pr)}</p>" for r in d["sommario"]))
                      .replace("__TITOLO__", titolo)
                      .replace("__STANDFIRST__", ricco(d["standfirst"], pr))
                      .replace("__FILE__", e(d["file"]))
                      .replace("__PESO__", peso(byte))
                      .replace("__PAGINE__", f' · {d["pagine"]} pagine' if d.get("pagine") else "")
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
            f'    <li data-voce="dispensa-{e(d["id"])}"><a href="{e(d["id"])}.html">\n'
            f'      <span class="n">Dispensa · {e(d["data"])}</span>\n'
            f'      <span class="t">{titolo}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"], pr)}</span>\n'
            f'      <span class="f">PDF · {peso(byte)} · fonte: {e(d["fonte"]["chi_corto"])}</span>\n'
            f'    </a></li>')

    if schede:
        indice = (INDICE
                  .replace("__TESTA__", testa(
                      "Le dispense — Da stampare e tenere vicino · Cyber Boomer",
                      "Fogli da leggere con calma e da stampare. Ognuno dice quanto pesa prima che tu lo apra, "
                      "e ha una fonte pubblica che puoi controllare.",
                      f"{DOMINIO}/dispense/", "website", "Le dispense — Da stampare e tenere vicino",
                      "Fogli da leggere con calma e da stampare. Con la fonte, sempre.", "../favicon.svg"))
                  .replace("__FIRMA__", FIRMA)
                  .replace("__VOCI__", "\n".join(voci)))
        dest = os.path.join(USCITA, "index.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(indice)
        scritti.append(dest)
    return scritti
