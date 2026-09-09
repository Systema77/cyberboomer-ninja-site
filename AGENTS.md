# AGENTS.md — SYSTEMA 77

Le regole complete stanno in **`CLAUDE.md`**, in questa cartella: leggilo prima di
toccare qualcosa.

⚠️ **Le pagine delle lezioni sono GENERATE.** Modificarne una a mano è lavoro buttato:
la prossima rigenerazione lo cancella. Si corregge la sorgente.

Questo file è la **porta d'ingresso per gli strumenti che non leggono `CLAUDE.md`**
(Antigravity e simili). È corto di proposito: il canone non si ricopia, si rimanda. Se i due dicono cose diverse, **vince `CLAUDE.md`**.
📜 *La stessa regola in due posti non resta uguale: resta uguale finché nessuno la tocca.*

## 1 · Il lavoro esiste solo se è in git

**Committa e spingi prima di chiudere la sessione.** Non creare cartelle nuove dentro
l'IDE: si clona un repo che esiste già, si committa **con percorsi espliciti** (mai
`git add -A`), si spinge.

> È già successo, nel 2026: un pezzo di sito costruito dentro un IDE è vissuto **solo
> lì**, non è mai entrato nel repo, e quando l'ambiente è cambiato era perso. Il ponte
> fra due strumenti è il commit, non lo schermo.

Su questi repo lavora più di una sessione alla volta: `git pull` prima di cominciare,
push appena finito. Un ramo per agente e per lavoro (`nome/cosa-fa`), e si unisce presto.

## 2 · Questo repo è pubblico

Non ci entrano: percorsi di cartelle private, recapiti, numeri di spesa, chiavi o
token, nomi di persone reali. **Una chiave in una pagina non è un segreto** — chiunque
apra il sorgente la prende.

## 3 · Non dichiarare quello che non hai misurato

Se non hai potuto controllare, scrivilo: «non ho potuto aprirlo» vale più di «dovrebbe
funzionare». Prima di spingere qualcosa che si vede, lancia il guardiano della casa
(`node strumenti/collaudo.mjs`): **rosso = non si pubblica**. Se non trova
Playwright non finge di aver guardato, lo dice — e allora non hai collaudato.

## 4 · Firma e data

Ogni file nuovo chiude con `— creato da NOME, AAAA-MM-GG`, e **la data si prende da
`date` nel terminale**, mai a memoria: l'orologio interno di un modello può essere
vecchio di giorni.

— creato da D.R.A.G.O., 2026-09-09
