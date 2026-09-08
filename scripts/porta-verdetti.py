#!/usr/bin/env python3
"""porta-verdetti.py — porta i verdetti del Dipartimento Verita' dentro questa casa.

    python3 scripts/porta-verdetti.py                 # prova: dice cosa farebbe, non scrive
    python3 scripts/porta-verdetti.py --scrivi        # scrive in verdetti/_sorgenti/
    python3 scripts/porta-verdetti.py --da /percorso/anima-console

LO LANCIA UNA PERSONA, MAI UN'AUTOMAZIONE. L'importazione non e' una copia: e' una
NATURALIZZAZIONE. Un verdetto scritto per la console del Direttore, per stare su
questo sito pubblico, deve: non essere su una persona · non rimandare alla console
(il suo dominio qui non si nomina) · non usare il lessico che questa casa vieta.
Nessuna delle tre si fa in sicurezza con uno script — ma uno script puo' dire QUALI
verdetti hanno il problema e tenerli fuori finche' qualcuno non li riscrive.

COSA FA. Legge le verifiche KIROSHI (`docs/data/NNNN-slug.json` in anima-console),
le porta sulla spina di comune.py e ci attacca il blocco `_ninja`:

    sorgente          da dove viene
    impronta          sha256 del file sorgente al momento dell'importazione
    importato_il      quando
    riletto_da/il     VUOTI: li compila la persona che rilegge (tipo_verdetto.py non
    riletto_impronta  pubblica finche' sono vuoti o su un'impronta vecchia)

Se il file di destinazione esiste gia', le firme di rilettura si CONSERVANO e si
aggiorna il resto: se la sorgente e' cambiata, l'impronta nuova non combacia con
quella riletta, e la pagina si ferma da sola finche' qualcuno non rilegge.

I verdetti BRAINDANCE (persone e notizie, `docs/data/braindance.json`) NON si
importano: il loro testo vive in schede HTML sulla console, non nel JSON, e una
voce su venti e' su una persona. Si elencano e basta.

— creato da JUDY, 2026-09-08
"""

import argparse
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import SITO, url_ok, valida  # noqa: E402

DEST = os.path.join(SITO, "verdetti", "_sorgenti")
FERMANO = (
    (re.compile(r"cyberboomer\.io", re.I), "rimanda alla console: da riscrivere"),
    (re.compile(r"\bsocial\b", re.I), "«social» e' lessico vietato qui: da riscrivere (decisione del Direttore in sospeso)"),
)


def oggi():
    # la regola dell'orologio: la data la dice il sistema, nel momento in cui si scrive
    return subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip()


def link_ammessi():
    """Gli indirizzi che il guardiano ammette come link cliccabili (blocco CASA di
    strumenti/collaudo.mjs). Un verdetto porta 10-20 fonti su host mai visti qui:
    il guardiano li ferma finche' non sono dichiarati, e fa bene. Questo elenco
    serve a dire a chi rilegge COSA dichiarare, senza tenerne una seconda copia."""
    with open(os.path.join(SITO, "strumenti", "collaudo.mjs"), encoding="utf-8") as fh:
        m = re.search(r"linkAmmessi:\s*\[(.*?)\]", fh.read(), re.S)
    return re.findall(r"'(https?://[^']+)'", m.group(1)) if m else []


def host_non_dichiarati(fonti, ammessi):
    fuori = set()
    for f in fonti:
        u = str(f.get("url", "")) if isinstance(f, dict) else ""
        if url_ok(u) and not any(u.startswith(a) for a in ammessi):
            fuori.add(re.sub(r"^(https?://[^/]+/).*$", r"\1", u + "/"))
    return sorted(fuori)


def impronta(percorso):
    with open(percorso, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def fonte_principale(fonti):
    buone = [f for f in fonti if isinstance(f, dict) and url_ok(f.get("url"))]
    if not buone:
        return None
    f = max(buone, key=lambda x: (x.get("autorevolezza") or 0))
    return {"titolo": f.get("titolo") or f["url"], "url": f["url"],
            "chi": f.get("tipo") or "fonte", "chi_corto": f.get("tipo") or "fonte"}


def sulla_spina(v, sid, percorso):
    """Un verdetto KIROSHI → la spina + il corpo di tipo_verdetto."""
    return {
        "tipo": "verdetto",
        "id": sid,
        "titolo": v.get("titolo"),
        "standfirst": v.get("domanda") or "",
        "data": v.get("data_verifica"),
        "tag": [t for t in (v.get("etichetta"), v.get("modalita")) if t],
        "provenienza": "casa",
        "fonte": fonte_principale(v.get("fonti") or []),
        "oggetto": v.get("oggetto"),
        "punteggio": v.get("punteggio"),
        "etichetta": v.get("etichetta"),
        "modalita": v.get("modalita"),
        "verdetto": v.get("verdetto"),
        "green_flags": v.get("green_flags") or [],
        "red_flags": v.get("red_flags") or [],
        "fonti": v.get("fonti") or [],
        "timeline": v.get("timeline") or [],
        "nota_sicurezza": v.get("nota_sicurezza"),
        "_ninja": {
            "sorgente": os.path.relpath(percorso, os.path.dirname(os.path.dirname(os.path.dirname(percorso)))),
            "impronta": impronta(percorso),
            "importato_il": oggi(),
            "riletto_da": None, "riletto_il": None, "riletto_impronta": None,
        },
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--da", default=os.path.join(SITO, "..", "anima-console"), help="la cartella di anima-console")
    p.add_argument("--scrivi", action="store_true", help="scrivi davvero (senza, dice solo cosa farebbe)")
    a = p.parse_args()
    dati = os.path.join(os.path.abspath(a.da), "docs", "data")
    if not os.path.isdir(dati):
        print(f"✗ non trovo {dati}: indica anima-console con --da")
        return 1

    esiti, scritti, da_dichiarare = [], 0, {}
    ammessi = link_ammessi()
    for percorso in sorted(glob.glob(os.path.join(dati, "[0-9]*.json"))):
        sid = os.path.splitext(os.path.basename(percorso))[0]
        with open(percorso, encoding="utf-8") as fh:
            v = json.load(fh)
        if v.get("tipo") == "persona" or v.get("soggetto") == "persona":
            esiti.append((sid, "FERMO", "e' su una persona: qui non entra"))
            continue
        testo = json.dumps(v, ensure_ascii=False)
        fermo = next((perche for re_, perche in FERMANO if re_.search(testo)), None)
        if fermo:
            esiti.append((sid, "FERMO", fermo))
            continue
        s = sulla_spina(v, sid, percorso)
        difetti = valida(s)
        if difetti:
            esiti.append((sid, "FERMO", "non sta sulla spina: " + " · ".join(difetti)))
            continue
        for h in host_non_dichiarati(s["fonti"], ammessi):
            da_dichiarare.setdefault(h, []).append(sid)
        dest = os.path.join(DEST, f"{sid}.json")
        stato = "nuovo"
        if os.path.exists(dest):
            with open(dest, encoding="utf-8") as fh:
                vecchio = json.load(fh)
            firme = {k: (vecchio.get("_ninja") or {}).get(k) for k in ("riletto_da", "riletto_il", "riletto_impronta")}
            s["_ninja"].update(firme)
            stessa = firme["riletto_impronta"] == s["_ninja"]["impronta"]
            stato = "aggiornato" + (" · rilettura ancora valida" if stessa else " · sorgente cambiata: DA RILEGGERE" if firme["riletto_da"] else " · in attesa di rilettura")
        else:
            stato += " · in attesa di rilettura"
        if a.scrivi:
            os.makedirs(DEST, exist_ok=True)
            with open(dest, "w", encoding="utf-8") as fh:
                json.dump(s, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
            scritti += 1
        esiti.append((sid, "scritto" if a.scrivi else "scriverei", stato))

    for sid, cosa, perche in esiti:
        print(f"  {'✗' if cosa == 'FERMO' else '·'} {sid:36} {cosa:9} {perche}")

    bd = os.path.join(dati, "braindance.json")
    if os.path.exists(bd):
        with open(bd, encoding="utf-8") as fh:
            voci = json.load(fh).get("verdetti", [])
        persone = sum(1 for x in voci if x.get("tipo") == "persona")
        print(f"\n  · braindance.json: {len(voci)} voci NON importate (il testo vive in schede HTML sulla console; "
              f"{persone} su una persona). Si riscrivono a mano, se mai.")

    if da_dichiarare:
        print(f"\n  ⚠ {len(da_dichiarare)} host di fonti NON sono in linkAmmessi del guardiano: finche' non li dichiara "
              f"chi rilegge (strumenti/collaudo.mjs, blocco CASA), la pagina del verdetto e' rossa. E' la regola "
              f"«dichiarato prima di comparire», e vale anche per le fonti:")
        for h, ids in sorted(da_dichiarare.items()):
            print(f"      {h:48} ← {', '.join(ids)}")

    fermi = sum(1 for x in esiti if x[1] == "FERMO")
    print(f"\n{'✓' if a.scrivi else '·'} {len(esiti) - fermi} importabili, {fermi} fermi"
          + (f" · {scritti} scritti in {os.path.relpath(DEST, SITO)}/" if a.scrivi else " · prova: niente scritto (usa --scrivi)"))
    print("  Poi: si rilegge ogni file, si compilano _ninja.riletto_da / riletto_il / riletto_impronta, "
          "si dichiarano gli host delle fonti nel guardiano, e python3 scripts/genera-tutto.py pubblica solo quelli firmati.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
