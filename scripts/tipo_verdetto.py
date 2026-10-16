#!/usr/bin/env python3
"""tipo_verdetto.py — il tipo VERDETTO: le verifiche del Dipartimento Verita', RILETTE qui.

Non si lancia: lo chiama genera-tutto.py. Le sorgenti stanno in `verdetti/_sorgenti/`
e ce le porta una persona con `scripts/porta-verdetti.py` (mai un'automazione: e'
l'incidente dell'01/08). Questo modulo scrive:

    verdetti/<id>.html      una per verdetto RILETTO
    verdetti/index.html     l'indice, solo se c'e' almeno un verdetto pubblicabile
    verdetti/fili.json      il filo in piazza di ogni verdetto (lo legge il Worker della piazza)

LA REGOLA CHE FA LA DIFFERENZA FRA «RISPECCHIATO» E «RISCRITTO»: il blocco `_ninja`.
porta-verdetti.py ci scrive l'impronta (sha256) della sorgente al momento
dell'importazione. Una persona rilegge il verdetto per questa casa — toglie ogni
rimando alla console, riscrive il lessico, controlla che non sia su una persona — e
firma: `riletto_da`, `riletto_il`, `riletto_impronta` (= l'impronta che ha riletto).
Il generatore pubblica SOLO se la firma c'e' ED e' sull'impronta corrente. Se la
sorgente cambia a monte, porta-verdetti aggiorna l'impronta, le firme non combaciano
piu', e la pagina resta ferma finche' qualcuno non rilegge. Un verdetto non riletto
non e' un errore: e' uno stato, e si aspetta. Un verdetto con dentro «social» o un
rimando alla console E' un errore, e ferma la corsa: si riscrive, non si esenta.

— creato da JUDY, 2026-09-08
"""

import hashlib
import json
import os
import re

from comune import DOMINIO, FIRMA, SITO, MarcaturaVietata, e, piano, ricco, testa, url_ok

SORGENTI = os.path.join(SITO, "verdetti", "_sorgenti")
USCITA = os.path.join(SITO, "verdetti")

CORPO = ("oggetto", "punteggio", "etichetta", "verdetto", "fonti")
# Le parole che qui non entrano: le stesse del guardiano, dette prima e col campo.
VIETATE = (
    (re.compile(r"cyberboomer\.io", re.I), "rimando alla console privata"),
    (re.compile(r"\bsocial\b", re.I), "lessico vietato in casa"),
)

# ————————————————————————————————— la forma ————————————————————————————————

PAGINA = """<!DOCTYPE html>
<html lang="it">
<head>
__TESTA__
</head>
<body>

<nav class="masthead"><a href="index.html">← I verdetti · tutti</a></nav>

<div class="wrap">

  <header class="lesson">
    <p class="serial">Verdetto · verificato il __DATA__</p>
    <h1>__TITOLO__</h1>
    <p class="standfirst">__STANDFIRST__</p>
  </header>

  <div class="referto" role="group" aria-label="Il punteggio di affidabilità">
    <span class="punteggio">__PUNTEGGIO__<small>/100</small></span>
    <span class="etichetta">__ETICHETTA__</span>
    <span class="oggetto">__OGGETTO__</span>
  </div>

__SEZIONI__

  <div class="fonte">
    <span class="et">✳ Le fonti — controlla tu</span>
    <ul class="fonti">
__FONTI__
    </ul>
  </div>

__NOTA__
  <p class="riletto">Riletto e riscritto per questa casa da __RILETTO_DA__ il __RILETTO_IL__.
  Verifica originale del Dipartimento Verità (modalità __MODALITA__): __DATA__.
  Il punteggio dice quanto ci si può fidare, non se conviene: la seconda è un'altra domanda.</p>

  <p class="riletto"><a href="../piazza/#__FILO__">Parlane in piazza</a></p>

</div>

__FIRMA__

<script src="/ninja.js" defer></script>
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
    <p class="serial">I verdetti</p>
    <h1>È vero? Ci si può fidare?</h1>
    <p class="standfirst">Ditte, prodotti e venditori passati al setaccio, con un punteggio
    da 0 a 100 e le fonti in fila. Riletti qui, uno per uno.</p>
  </header>

  <section class="intro">
    <div class="prose">
      <p><strong>Un verdetto valuta l'affidabilità, non accusa.</strong> Il punteggio porta
      dichiarata la sua incertezza, ogni riga ha una fonte che puoi aprire, e chi è
      valutato ha diritto di replica. <em>Controlla tu.</em></p>
    </div>
  </section>

  <ul class="elenco">
__VOCI__
  </ul>

</div>

__FIRMA__

<script src="/ninja.js" defer></script>
</body>
</html>
"""


# ————————————————————————————————— i controlli ————————————————————————————————

def difetti_corpo(d):
    """Errori veri: fermano la corsa. (Il «non riletto» non sta qui: e' uno stato.)"""
    difetti = [f"manca «{c}»" for c in CORPO if d.get(c) in (None, "", [])]
    if not isinstance(d.get("punteggio"), int) or not 0 <= d["punteggio"] <= 100:
        difetti.append("«punteggio» non e' un intero da 0 a 100")
    if d.get("soggetto") == "persona":
        difetti.append("e' su una persona: qui non entra, in nessuna forma")
    if not any(isinstance(f, dict) and url_ok(f.get("url")) for f in d.get("fonti") or []):
        difetti.append("nessuna fonte con URL cliccabile")
    if not (d.get("_ninja") or {}).get("impronta"):
        difetti.append("manca _ninja.impronta: la scrive porta-verdetti.py, non si compila a mano")
    corpo = json.dumps({k: v for k, v in d.items() if not k.startswith("_")}, ensure_ascii=False)
    for re_, perche in VIETATE:
        m = re_.search(corpo)
        if m:
            difetti.append(f"«{m.group(0)}» nel testo — {perche}: si riscrive, non si esenta")
    return difetti


def in_attesa(d):
    """Perche' questo verdetto non si pubblica ancora — o None se e' pronto."""
    n = d.get("_ninja") or {}
    if not (n.get("riletto_da") and n.get("riletto_il")):
        return "non ancora riletto per questa casa (_ninja.riletto_da / riletto_il)"
    if n.get("riletto_impronta") != n.get("impronta"):
        return "riletto su una versione precedente della sorgente: va riletto (riletto_impronta ≠ impronta)"
    return None


# ————————————————————————————————— il corpo ————————————————————————————————

def elenco(voci, pr, classe):
    return (f'    <ul class="segnali {classe}">\n'
            + "\n".join(f"      <li>{ricco(v, pr)}</li>" for v in voci)
            + "\n    </ul>\n")


def sezioni(d, pr):
    fuori = [("Il verdetto", f'    <div class="prose">\n      <p>{ricco(d["verdetto"], pr)}</p>\n    </div>\n')]
    if d.get("green_flags"):
        fuori.append(("Segnali a favore", elenco(d["green_flags"], pr, "pro")))
    if d.get("red_flags"):
        fuori.append(("Segnali contro", elenco(d["red_flags"], pr, "contro")))
    if d.get("timeline"):
        righe = "\n".join(f'      <li><time>{e(t.get("data", ""))}</time> {ricco(t.get("evento", ""), pr)}</li>'
                          for t in d["timeline"])
        fuori.append(("La cronologia", f'    <ul class="crono">\n{righe}\n    </ul>\n'))
    return "\n".join(
        f'  <section class="beat">\n'
        f'    <h2 class="beat-label"><span class="num">{i + 1:02d}</span>{e(t)}</h2>\n'
        f'{c}  </section>\n'
        for i, (t, c) in enumerate(fuori))


def fonti(d, pr):
    righe = []
    for f in d["fonti"]:
        if not url_ok(f.get("url")):
            continue
        chi = " · ".join(x for x in (f.get("tipo"), f.get("sostiene")) if x)
        righe.append(f'      <li><a href="{e(f["url"])}" rel="noopener" target="_blank">{e(f.get("titolo") or f["url"])}</a>'
                     + (f'\n        <span class="chi">{ricco(chi, pr)}</span>' if chi else "") + "</li>")
    return "\n".join(righe)


def testo(d):
    pezzi = [d["oggetto"], d["verdetto"]] + list(d.get("green_flags") or []) + list(d.get("red_flags") or [])
    pezzi += [t.get("evento", "") for t in d.get("timeline") or []] + [d.get("nota_sicurezza") or ""]
    return " ".join(pezzi)


def voce_archivio(d):
    return {
        "tipo": "verdetto", "id": d["id"], "url": f"/verdetti/{d['id']}.html",
        "titolo": d["titolo"], "standfirst": piano(d["standfirst"]),
        "tag": d["tag"], "data": d["data"], "testo": piano(testo(d)),
    }


# ————————————————————————————————— il filo in piazza ————————————————————————
# Ogni verdetto pubblicato apre un filo (JUDY-69 = 1, 16/10). L'id del filo e' fisso,
# ricavato dall'id del verdetto: il Worker lo inserisce una volta sola, e un filo tolto
# da ECHO resta tolto. Testo e titolo: il modello di ECHO, SQUELCH/DA-ECHO-2026-10-16-*.

def id_filo(d):
    return hashlib.sha256(("verdetto:" + d["id"]).encode()).hexdigest()[:16]


def voce_filo(d):
    titolo = d["titolo"] if len(d["titolo"]) <= 120 else d["titolo"][:117] + "…"
    giudizio = d["etichetta"] + (f" ({d['punteggio']} su 100)" if d.get("punteggio") is not None else "")
    testo = (f"Cyber Boomer ha pubblicato un verdetto: {giudizio}.\n\n"
             f"{piano(d['standfirst'])}\n\n"
             f"Il verdetto, con le fonti e la linea del tempo: {DOMINIO}/verdetti/{d['id']}.html\n\n"
             "Hai una fonte in più, una correzione o un dubbio? Scrivilo qui sotto, meglio se con un link. "
             "Il verdetto cambia solo con una nota datata, non a voce.")
    return {"id": id_filo(d), "categoria": "verdetto", "titolo": titolo, "testo": testo[:2000]}


# ————————————————————————————————— la corsa ————————————————————————————————

def genera(schede):
    """Scrive le pagine dei verdetti pronti e l'indice. Torna (scritti, in_attesa),
    o None se un verdetto ha un errore vero."""
    pronti, attesa = [], []
    for d in schede:
        mancanti = difetti_corpo(d)
        if mancanti:
            print(f"✗ {d['_file']}: " + " · ".join(mancanti))
            return None
        motivo = in_attesa(d)
        (attesa.append((d["_file"], motivo)) if motivo else pronti.append(d))

    pronti.sort(key=lambda d: (d["data"], d["id"]), reverse=True)
    scritti, voci = [], []
    if pronti:
        os.makedirs(USCITA, exist_ok=True)   # la cartella nasce col primo verdetto, non prima
    for d in pronti:
        pr, n = d["provenienza"], d["_ninja"]
        titolo, desc = e(d["titolo"]), e(piano(d["standfirst"]))
        url = f"{DOMINIO}/verdetti/{d['id']}.html"
        try:
            pagina = (PAGINA
                      .replace("__TESTA__", testa(f"{titolo} — Verdetto · Cyber Boomer", desc, url, "article",
                                                  f"{titolo} — Verdetto", desc, "../favicon.svg"))
                      .replace("__FIRMA__", FIRMA)
                      .replace("__SEZIONI__", sezioni(d, pr))
                      .replace("__FONTI__", fonti(d, pr))
                      .replace("__NOTA__", f'  <p class="nota">✳ {ricco(d["nota_sicurezza"], pr)}</p>\n'
                               if d.get("nota_sicurezza") else "")
                      .replace("__TITOLO__", titolo)
                      .replace("__STANDFIRST__", ricco(d["standfirst"], pr))
                      .replace("__OGGETTO__", ricco(d["oggetto"], pr))
                      .replace("__PUNTEGGIO__", str(d["punteggio"]))
                      .replace("__ETICHETTA__", e(d["etichetta"]))
                      .replace("__MODALITA__", e(d.get("modalita") or "rapida"))
                      .replace("__RILETTO_DA__", e(n["riletto_da"]))
                      .replace("__RILETTO_IL__", e(n["riletto_il"]))
                      .replace("__FILO__", id_filo(d))
                      .replace("__DATA__", e(d["data"])))
        except MarcaturaVietata as tag:
            print(f"✗ {d['_file']}: marcatura fuori dalla allowlist: {tag}")
            return None
        dest = os.path.join(USCITA, f"{d['id']}.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(pagina)
        scritti.append(dest)
        voci.append(
            f'    <li data-voce="verdetto-{e(d["id"])}"><a href="{e(d["id"])}.html">\n'
            f'      <span class="n">Verdetto · {e(d["data"])}</span>\n'
            f'      <span class="t">{titolo}</span>\n'
            f'      <span class="d">{ricco(d["standfirst"], pr)}</span>\n'
            f'      <span class="f">{d["punteggio"]}/100 · {e(d["etichetta"])} · '
            f'{sum(1 for x in d["fonti"] if url_ok(x.get("url")))} fonti</span>\n'
            f'    </a></li>')

    if pronti:
        indice = (INDICE
                  .replace("__TESTA__", testa(
                      "I verdetti — È vero? Ci si può fidare? · Cyber Boomer",
                      "Ditte, prodotti e venditori passati al setaccio: punteggio da 0 a 100, "
                      "fonti in fila, diritto di replica. Riletti qui uno per uno.",
                      f"{DOMINIO}/verdetti/", "website", "I verdetti — È vero? Ci si può fidare?",
                      "Ditte, prodotti e venditori passati al setaccio. Con le fonti, sempre.",
                      "../favicon.svg"))
                  .replace("__FIRMA__", FIRMA)
                  .replace("__VOCI__", "\n".join(voci)))
        dest = os.path.join(USCITA, "index.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(indice)
        scritti.append(dest)
        dest = os.path.join(USCITA, "fili.json")
        with open(dest, "w", encoding="utf-8") as f:
            json.dump({"fili": [voce_filo(d) for d in pronti]}, f, ensure_ascii=False, indent=1)
            f.write("\n")
        scritti.append(dest)
    return scritti, attesa, pronti
