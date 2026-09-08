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
scripts/genera-tutto.py   LA CORSA: tutte le schede, gli indici, la sitemap
scripts/comune.py         il tronco: la spina dello schema, ricco(), head, piede
scripts/tipo_lezione.py   il tipo lezione: adattatore del formato v1 + le pagine
scripts/prova-ricco.py    il banco dei casi cattivi di ricco()
strumenti/collaudo.mjs    il guardiano
```

**Le lezioni non si scrivono a mano.** Si scrive un JSON in `lezioni/_sorgenti/`
e si rigenera: la forma (le quattro battute, le meta) la mette lo script.
Modificare a mano un `lezione-*.html` è inutile — la prima rigenerazione lo sovrascrive.

**Lo schema è uno.** Ogni scheda — lezione oggi, dispensa, ascolto e verdetto domani —
ha la stessa spina: `tipo · id · titolo · standfirst · data · tag · provenienza · fonte`,
più un corpo per tipo. È scritta in `scripts/comune.py`, e la regola della fonte
cliccabile vale per tutti perché sta nella spina. **Le sei lezioni esistenti non
sono state migrate:** un adattatore legge il loro formato e le porta sulla spina al
volo, e le pagine escono byte-identiche a prima.

**Il vestito è un file solo, `stile.css`.** Fino all'08/09 viveva in tre copie
(home, 404, e una costante dentro il generatore) che dovevano essere uguali e non
lo erano. Le pagine a mano tengono in un `<style>` solo ciò che è loro. Il guardiano
legge anche il CSS: un colore o una parola vietata lì dentro lo fa diventare rosso.

## I due comandi

```bash
python3 scripts/genera-tutto.py       # UNA corsa: banco di ricco(), lezioni, indice, sitemap
node    scripts/genera-og-image.mjs   # l'immagine che si vede incollando il link
```

`genera-tutto.py` si ferma al primo errore e dice quale: una scheda senza fonte, un
tag fuori dalla allowlist, un JSON rotto. Non esiste più un generatore per tipo da
lanciare a mano nell'ordine giusto.

## Il guardiano — si lancia PRIMA di ogni push

```bash
node strumenti/collaudo.mjs           # completo: statico + browser vero
node strumenti/collaudo.mjs --veloce  # solo statico, due secondi
```

Controlla, con i numeri: colori di altre case, lessico vietato, link interni rotti,
indirizzi esterni non dichiarati (dove il lettore clicca **e** dove la pagina attinge
da sola: `src`, `url()`, `@import`, `fetch`), la fonte cliccabile su ogni scheda,
i pesi (nessun file sopra 4 MB, niente audio/video/master), meta obbligatorie,
cookie e tracker, `prefers-reduced-motion`, e — aprendo davvero le pagine in un
browser headless a **320 / 768 / 1600 px** — che nessuna pagina sbordi in
orizzontale e che la console sia pulita.
Colori, lessico e movimento li cerca **anche in `stile.css`**, non solo negli HTML.

Il browser lo cerca sul Mac, su Linux e nella cache di Playwright, oppure dove dice
`COLLAUDO_BROWSER=/percorso`. **Se non lo trova, il collaudo completo è rosso**: non
finge di aver guardato. Per i soli controlli statici c'è `--veloce`, e lo dichiara.

Esce con codice `1` se trova anche un solo rosso. Non ha dipendenze: niente `npm install`.

## Le regole della casa

- **Nessuna lezione senza fonte pubblica cliccabile.** Il generatore si rifiuta di
  costruirla. Qui si parla di aziende grandi come nazioni: senza fonte è una chiacchiera.
- **Due provenienze, e la seconda non ha marcatura.** Un testo di `casa` può portare
  solo `strong`, `em`, `span.falso` e `a` con `href` http(s): la lista è chiusa in
  `scripts/comune.py`, e un tag fuori lista **ferma il generatore**. Un testo di
  `proposta` (scritto da un terzo) esce sempre come testo, qualunque cosa contenga.
  Il banco dei casi cattivi: `python3 scripts/prova-ricco.py`.
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
