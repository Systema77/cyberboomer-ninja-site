#!/usr/bin/env python3
"""genera-tutto.py — UNA corsa sola: tutte le schede, gli indici, la mappa del sito.

    python3 scripts/genera-tutto.py

Fino all'08/09 c'erano un generatore per le lezioni e uno per la sitemap, da
lanciare in fila e nell'ordine giusto. Adesso la corsa e' una, e fa in ordine:

    0. il banco di ricco()      — se il sanitizer non passa i suoi 58 casi, non si genera
    1. le LEZIONI               — lezioni/_sorgenti/*.json (formato v1, adattato al volo)
    2. la MAPPA DEL SITO        — sitemap.xml, dai file veri
   (3. i tipi che verranno      — dispense, ascolti, verdetti: una riga ciascuno qui sotto)

Si ferma al primo errore, e dice quale. Nessuna dipendenza: solo la libreria standard.

— creato da JUDY, 2026-09-08
"""

import os
import subprocess
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)

import tipo_lezione  # noqa: E402
from comune import SITO, carica  # noqa: E402


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

    # 2. la mappa del sito, dai file che esistono adesso
    if not passo("la sitemap non si e' rigenerata", "genera-sitemap.py"):
        return 1
    print("✓ sitemap.xml rigenerata")
    return 0


if __name__ == "__main__":
    sys.exit(main())
