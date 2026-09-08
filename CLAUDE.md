# CLAUDE.md — cyberboomer.ninja

Istruzioni per chi lavora in questo repo. Vale sia per una persona sia per un agente.

## Cos'è questo posto

`cyberboomer.ninja` è **la voce**: il pianeta di SYSTEMA 77 che spiega.
Non vende niente, e non deve mai sembrare che lo faccia — la porta pubblica
(`systema77.com/divulgazione.html`) manda qui proprio perché *«chi vende e chi
spiega non devono essere la stessa voce»*. Se un giorno qui compare un prezzo,
il ponte perde senso da tutte e due le parti.

## La regola numero uno: le pagine sono GENERATE

`lezioni/lezione-*.html` e `lezioni/index.html` **si rigenerano da zero** a ogni corsa.
Il contenuto vive in `lezioni/_sorgenti/*.json`.

> Modificare a mano una lezione è lavoro buttato: la prossima rigenerazione lo cancella.
> Se una lezione va corretta, si corregge il **JSON**.

Per una lezione nuova: copia un JSON esistente per il corpo (le quattro battute), ma
scrivila **sulla spina**: `tipo: "lezione"`, `id` (il numero, «007»), `titolo`,
`standfirst`, `data`, `tag`, `provenienza: "casa"`, `fonte`. Il formato vecchio con
`n` lo legge un adattatore, ma nasce senza data né tag: va bene per le sei che c'erano,
non per le nuove. Una corsa sola, che fa anche la sitemap:

```bash
python3 scripts/genera-tutto.py
```

Lo schema di ogni scheda (lezione, verdetto, dispensa, ascolto) è la spina in
`scripts/comune.py`: `tipo · id · titolo · standfirst · data · tag · provenienza · fonte`.
Le sei lezioni del formato vecchio **non si migrano**: le legge un adattatore.

I **verdetti** arrivano da `anima-console` con `python3 scripts/porta-verdetti.py --scrivi`
(una persona, mai un'automazione) e si pubblicano **solo dopo che qualcuno li ha riletti
e firmati** nel blocco `_ninja` del JSON. «Leggibili qui» vuol dire riscritti qui, non
rispecchiati: niente persone, niente rimandi alla console, niente lessico vietato — e
ogni host delle fonti dichiarato nel guardiano prima di comparire.

Il vestito **non sta nei generatori e non sta nelle pagine**: sta in `stile.css`, uno
per tutta la casa. Le pagine a mano (`index.html`, `404.html`) lo linkano e tengono
in un `<style>` solo ciò che è loro. Il guardiano legge anche il CSS.

## La regola numero due: nessuna affermazione senza fonte

Ogni lezione ha un campo `fonte` con un `url` cliccabile — informativa ufficiale,
pagina di supporto dell'azienda, autorità pubblica o stampa indipendente.
**Il generatore si ferma se manca**, e fa bene: qui si parla di Meta e Google a
gente che non ha modo di verificarci.

Si spiega, **non si accusa**. La differenza fra le due cose è esattamente quel link.
E la vittima della storia è sempre il Boomer, **mai il lettore**.

Nei testi c'è marcatura minima (`strong`, `em`, `span.falso`, `a` con `href` http(s))
**solo se il testo è di casa**. La lista è chiusa in `scripts/comune.py` e un tag fuori
lista ferma il generatore: si corregge il JSON, non si allarga la lista. Un testo che
arriva da un terzo ha provenienza `proposta` ed esce sempre come testo puro.
Prima di toccare `ricco()`: `python3 scripts/prova-ricco.py`.

## La regola numero tre: si collauda prima di pubblicare

```bash
node strumenti/collaudo.mjs
```

Rosso = non si pubblica. Il guardiano non è un parere: apre le pagine in un browser
vero a 320 / 768 / 1600 px e misura — anche quali host la pagina chiama davvero e se
scrive cookie. Se qualcosa gli sfugge, **si aggiunge un controllo** al blocco `CASA`
in cima al file — non si aggira. Legge tutto ciò che Pages serve (HTML, CSS, JS, SVG,
JSON…); `scripts/` e `strumenti/` stanno fuori dal sito grazie a `_config.yml`. Il browser lo cerca da solo (Mac,
Linux, cache di Playwright, o `COLLAUDO_BROWSER=/percorso`): **se non lo trova, il
collaudo completo è rosso**, non una nota. Per i soli controlli statici c'è `--veloce`,
che lo dichiara.

## Cosa non si scrive, mai

| vietato | perché |
|---|---|
| `cyberboomer.io` | è la console privata, non si nomina sul sito pubblico |
| il nome o il dominio del gioco | il gioco è a invito e qui **tace** |
| «Cyberboomer» attaccato | sono **due parole**: Cyber Boomer |
| giallo `#F2E205` · ciano `#16E0DC` · verde `#38E08A` · magenta `#FF2E88` | sono i colori di altre case della galassia |
| un link a un profilo non ancora aperto | finché non è verificato si scrive «in arrivo» |
| dati di persone reali | mai, in nessuna forma |
| ditte o prodotti senza fonte cliccabile | mai |

## Il tono

Buffo, fuori dagli schemi, prima persona. Il Boomer racconta una cosa che è
successa **a lui** e ci ride sopra. Niente allarmismo: *la paura non ha mai
insegnato niente a nessuno.* Niente gergo non spiegato — se una frase la capisce
solo chi è del mestiere, è sbagliata.

## Stati onesti

- Il contatore dice **«000042 (contate a mano)»**. Resta così. Non si spiega in pagina.
- **«Ottimizzato per Netscape 2077»** è la firma della casa: resta.
- Quello che non c'è ancora si dichiara «in arrivo». Non si finge.

## Attribuzione

Ogni file nuovo porta una riga tipo `— creato da NOME, AAAA-MM-GG`: in coda nei
documenti, **nell'intestazione** negli script e nei fogli di stile (è così in tutti
quelli della casa: la regola qui diceva «in coda» e nessun file la seguiva —
corretta l'08/09 per dire ciò che si fa).

— creato da FLUX, 2026-09-05
