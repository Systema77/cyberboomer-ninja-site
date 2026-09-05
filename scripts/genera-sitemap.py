#!/usr/bin/env python3
"""genera-sitemap.py — la mappa del sito, presa dai file.

    python3 scripts/genera-sitemap.py

Una sitemap scritta a mano e' sbagliata dal primo file nuovo, e nessuno se ne
accorge perche' la leggono solo i motori di ricerca. Questa si rigenera: elenca
gli HTML che esistono davvero, con la data dell'ultima modifica del file.

Il 404 resta fuori: e' una pagina che esiste per non essere trovata.

— creato da FLUX, 2026-09-05
"""
import os, sys
from datetime import date

QUI = os.path.dirname(os.path.abspath(__file__))
SITO = os.path.abspath(os.path.join(QUI, ".."))
DOMINIO = "https://cyberboomer.ninja"
FUORI = {"404.html"}


def pagine():
    for radice, dirs, files in os.walk(SITO):
        dirs[:] = sorted(d for d in dirs
                         if not d.startswith(".") and d not in ("node_modules", "scripts", "strumenti", "_sorgenti"))
        for f in sorted(files):
            if f.endswith(".html") and f not in FUORI:
                yield os.path.join(radice, f)


def main():
    voci = []
    for p in sorted(pagine()):
        rel = os.path.relpath(p, SITO).replace(os.sep, "/")
        url = f"{DOMINIO}/" if rel == "index.html" else \
              f"{DOMINIO}/{rel[:-len('index.html')]}" if rel.endswith("/index.html") else \
              f"{DOMINIO}/{rel}"
        mod = date.fromtimestamp(os.path.getmtime(p)).isoformat()
        priorita = "1.0" if rel == "index.html" else ("0.8" if rel.endswith("/index.html") else "0.6")
        voci.append(f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{mod}</lastmod>\n"
                    f"    <priority>{priorita}</priority>\n  </url>")

    with open(os.path.join(SITO, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "\n".join(voci) + "\n</urlset>\n")
    print(f"✓ sitemap.xml — {len(voci)} pagine")
    for v in voci:
        print("  " + v.split("<loc>")[1].split("</loc>")[0])
    return 0


if __name__ == "__main__":
    sys.exit(main())
