# cyberboomer.ninja — la voce

**Divulgazione dal 2077.** Trappole digitali vere, spiegate senza paroloni e smontate ridendo.
È il pianeta di [SYSTEMA 77](https://systema77.com/divulgazione.html) che racconta.

> Chi vende e chi spiega non devono essere la stessa voce.
> Su systema77.com c'è quello che facciamo e quanto costa. **Qui non si vende niente.**

Sito statico, senza framework, senza build, senza cookie e senza tracker.
Pubblicato con GitHub Pages su `main`, path `/`.

---

## Com'è fatto

```
index.html            la home
stile.css             IL VESTITO — uno per tutta la casa, linkato da ogni pagina
lezioni/index.html    il dojo — l'indice delle lezioni      ← GENERATO
lezioni/lezione-*.html  le lezioni                          ← GENERATE
lezioni/_sorgenti/*.json  il contenuto delle lezioni        ← QUI SI SCRIVE
404.html · robots.txt · sitemap.xml · favicon.svg · og-image.png
scripts/comune.py     il tronco dei generatori (head, piede, escaping)
scripts/              i tre generatori
strumenti/collaudo.mjs  il guardiano
```

**Le lezioni non si scrivono a mano.** Si scrive un JSON in `lezioni/_sorgenti/`
e si rigenera: la forma (le quattro battute, le meta) la mette lo script.
Modificare a mano un `lezione-*.html` è inutile — la prima rigenerazione lo sovrascrive.

**Il vestito è un file solo, `stile.css`.** Fino all'08/09 viveva in tre copie
(home, 404, e una costante dentro il generatore) che dovevano essere uguali e non
lo erano. Le pagine a mano tengono in un `<style>` solo ciò che è loro. Il guardiano
legge anche il CSS: un colore o una parola vietata lì dentro lo fa diventare rosso.

## I tre comandi

```bash
python3 scripts/genera-lezione.py     # le lezioni + l'indice del dojo
python3 scripts/genera-sitemap.py     # la mappa del sito, dai file veri
node    scripts/genera-og-image.mjs   # l'immagine che si vede incollando il link
```

## Il guardiano — si lancia PRIMA di ogni push

```bash
node strumenti/collaudo.mjs           # completo: statico + browser vero
node strumenti/collaudo.mjs --veloce  # solo statico, due secondi
```

Controlla, con i numeri: colori di altre case, lessico vietato, link interni rotti,
link esterni non dichiarati, meta obbligatorie, cookie e tracker, `prefers-reduced-motion`,
e — aprendo davvero le pagine in un browser headless a **320 / 768 / 1600 px** —
che nessuna pagina sbordi in orizzontale e che la console sia pulita.
Colori, lessico e movimento li cerca **anche in `stile.css`**, non solo negli HTML.

Esce con codice `1` se trova anche un solo rosso. Non ha dipendenze: niente `npm install`.

## Le regole della casa

- **Nessuna lezione senza fonte pubblica cliccabile.** Il generatore si rifiuta di
  costruirla. Qui si parla di aziende grandi come nazioni: senza fonte è una chiacchiera.
- **«Cyber Boomer» in due parole**, sempre (tranne nel dominio).
- **Un colore = un significato.** Qui il colore è il blu link `#5C7CFF` su nero.
  Il giallo dell'agenzia, il ciano del Systema, il verde del gioco e il magenta
  non entrano: il guardiano li respinge.
- **Non si promettono posti che non esistono.** Finché un profilo non è aperto e
  verificato, si scrive «in arrivo» e non si mette il link. È il primo trucco che
  insegniamo a riconoscere: non lo facciamo noi.
- **Niente cookie e niente tracker.** È scritto in pagina, quindi è verificato dal guardiano.

## Licenza e crediti

Contenuti e codice di SYSTEMA 77. Le fonti citate nelle lezioni appartengono ai
rispettivi titolari e sono linkate perché il lettore possa controllare da sé.

— *Ottimizzato per Netscape 2077.*
