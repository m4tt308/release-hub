# Handoff — Release Hub

File di tracciamento delle sessioni di lavoro su questo progetto. Ogni nuova
sessione deve **aggiungere** una voce (non sovrascrivere le precedenti):
una sezione "Requisiti" con le richieste ricevute e una sezione "Sessioni"
con un blocco per giorno che riassume le modifiche fatte.

## Requisiti

Elenco delle richieste ricevute dall'utente, in ordine cronologico.

- **2026-11-03** — Creare una repository/piattaforma gratuita per distribuire
  e gestire lo storico delle release di applicazioni personalizzate, con
  infrastruttura 100% gratuita basata su GitHub come backend/storage per
  asset binari e sorgenti. Requisiti dettagliati:
  1. Gestione release via GitHub Releases (SemVer, changelog, hosting asset
     `.exe`/`.zip`/`.deb`).
  2. Sito statico vetrina (GitHub Pages o Vercel) che consuma le GitHub
     REST API per mostrare: elenco app con descrizione/icona, ultima
     versione con download diretto, storico release con changelog,
     contatore download totali per app.
  3. Workflow GitHub Actions che crea una release automaticamente ad ogni
     push di un tag Git.
  4. Deliverable richiesti: (A) architettura e struttura repo, (B) codice
     HTML/CSS/JS della vetrina, (C) file
     `.github/workflows/release.yml`, (D) procedura di prima configurazione
     passo-passo.
- **2026-11-03** — Procedere in autonomia sulla realizzazione del progetto e
  creare un file di handoff che tracci le sessioni di lavoro (una voce per
  giorno con le modifiche fatte) e una sezione "Requisiti" con le richieste
  ricevute.

## Sessioni

### 2026-11-03

- Creata struttura iniziale del progetto "Release Hub" in questa cartella:
  - [index.html](index.html), [css/style.css](css/style.css) — vetrina statica (tema scuro, card responsive).
  - [js/config.js](js/config.js) — elenco configurabile delle app (placeholder da compilare con i repo reali).
  - [js/app.js](js/app.js) — fetch GitHub REST API con cache 5 min in `sessionStorage`, gestione rate limit, sanitizzazione Markdown per il changelog, rendering ultima versione + storico + contatore download.
  - [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) — deploy automatico della vetrina su GitHub Pages ad ogni push su `main`.
  - [templates/app-repo-template/.github/workflows/release.yml](templates/app-repo-template/.github/workflows/release.yml) — template da copiare in ciascun repo-app: si attiva sul tag `v*.*.*`, builda, crea la Release con changelog auto-generato e allega gli asset da `dist/`.
  - [templates/app-repo-template/README.md](templates/app-repo-template/README.md) — istruzioni d'uso del template.
  - [README.md](README.md) — architettura, descrizione del codice, procedura di setup passo-passo.
- Verificati: sintassi JS (`node --check`) e che tutti i file statici vengano serviti correttamente da un server HTTP locale.
- Su richiesta dell'utente di procedere in autonomia:
  - Inizializzato il repository git locale e creato il primo commit.
  - Creato il repository GitHub pubblico `m4tt308/release-hub` e fatto il push iniziale.
  - Abilitato GitHub Pages con sorgente "GitHub Actions" sul repository.
  - Creato questo file [HANDOFF.md](HANDOFF.md).
- **Da fare in una prossima sessione (richiede input dell'utente):**
  - Sostituire i placeholder in [js/config.js](js/config.js) con i repository reali delle app da mostrare in vetrina (owner, repo, nome, descrizione, icona).
  - Creare/scegliere i repository delle singole app e copiarvi il template del workflow di release.
  - Pubblicare il primo tag SemVer (`v1.0.0`) su almeno un'app per vedere la vetrina popolata con dati reali.
