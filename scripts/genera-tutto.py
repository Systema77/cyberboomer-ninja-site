#!/usr/bin/env python3
"""genera-tutto.py — UNA corsa sola: tutte le schede, gli indici, la mappa del sito.

    python3 scripts/genera-tutto.py

Fino all'08/09 c'erano un generatore per le lezioni e uno per la sitemap, da
lanciare in fila e nell'ordine giusto. Adesso la corsa e' una, e fa in ordine:

    0. il banco di ricco()      — se il sanitizer non passa i suoi 58 casi, non si genera
    1. le LEZIONI               — lezioni/_sorgenti/*.json (formato v1, adattato al volo)
    2. i VERDETTI               — verdetti/_sorgenti/*.json: solo quelli RILETTI e firmati
    3. L'INDICE DELLA RICERCA   — archivio.json: una riga per scheda, col testo puro
    4. la MAPPA DEL SITO        — sitemap.xml, dai file veri
   (5. i tipi che verranno      — dispense, ascolti: una riga ciascuno qui sotto)

Si ferma al primo errore, e dice quale. Nessuna dipendenza: solo la libreria standard.

— creato da JUDY, 2026-09-08
"""

import json
import os
import subprocess
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)

import tipo_lezione  # noqa: E402
import tipo_verdetto  # noqa: E402
from comune import SITO, carica  # noqa: E402

ARCHIVIO = os.path.join(SITO, "archivio.json")


def passo(nome, script):
    """Lancia uno script di casa e torna True se e' andato."""
    esito = subprocess.run([sys.executable, os.path.join(QUI, script)], capture_output=True, text=True)
    if esito.returncode != 0:
        print(f"✗ {nome}\n" + (esito.stdout + esito.stderr).rstrip())
        return False
    return True


def main():
    # 0. il banco: un generatore che non si fida del proprio sanitizer non parte
    if not passo("il banco di ricco() non passa: non si genera niente", "prova-ricco.py"):
        return 1

    # 1. le lezioni
    lezioni = carica(tipo_lezione.SORGENTI, adatta=tipo_lezione.adatta)
    if lezioni is None:
        return 1
    if not lezioni:
        print(f"✗ nessuna sorgente in {os.path.relpath(tipo_lezione.SORGENTI, SITO)}/")
        return 1
    scritti = tipo_lezione.genera(lezioni)
    if scritti is None:
        return 1
    print(f"✓ {len(lezioni)} lezioni + l'indice del dojo")
    for d in sorted(lezioni, key=lambda d: d["id"]):
        print(f"  – n.{d['id']}  {d['titolo']}")
        print(f"           fonte: {d['fonte']['url']}")

    # 2. i verdetti: si pubblicano solo quelli riletti e firmati per questa casa.
    #    Gli altri aspettano, e si dice quanti. Un errore vero (parola vietata, campo
    #    mancante, persona) ferma la corsa come per ogni altro tipo.
    verdetti = carica(tipo_verdetto.SORGENTI)
    if verdetti is None:
        return 1
    esito = tipo_verdetto.genera(verdetti)
    if esito is None:
        return 1
    _, attesa, pubblicati = esito
    if verdetti:
        print(f"✓ {len(pubblicati)} verdetti pubblicati" + (f" · {len(attesa)} in attesa di rilettura" if attesa else ""))
        for nome, motivo in attesa:
            print(f"  ⏸ {nome}: {motivo}")

    # 3. l'indice della ricerca: una riga per scheda, di ogni tipo, col testo puro.
    #    Lo legge il <script> inline dell'indice del dojo, stessa origine, per cercare
    #    anche dentro le lezioni e non solo nei titoli. Oltre le ~1500 voci questo
    #    disegno e' finito: la soglia sta nel guardiano, cosi' ce ne accorgiamo noi.
    voci = [tipo_lezione.voce_archivio(d) for d in lezioni] + [tipo_verdetto.voce_archivio(d) for d in pubblicati]
    voci.sort(key=lambda v: (v["data"] or "", v["tipo"], v["id"]), reverse=True)
    with open(ARCHIVIO, "w", encoding="utf-8") as f:
        json.dump(voci, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"✓ archivio.json — {len(voci)} voci")

    # 4. la mappa del sito, dai file che esistono adesso
    if not passo("la sitemap non si e' rigenerata", "genera-sitemap.py"):
        return 1
    print("✓ sitemap.xml rigenerata")
    return 0


if __name__ == "__main__":
    sys.exit(main())
