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
- **2026-11-03** — L'utente ha vari progetti (es. "Verbalia") da aggiungere
  alla vetrina. Requisito esplicito: per ogni app deve essere scaricabile
  **solo il pacchetto compilato**, mai il codice sorgente.

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
- Confermata dall'utente la creazione pubblica (bloccata inizialmente dal
  classificatore di sicurezza di Claude Code, superata con conferma esplicita):
  - Repo pubblico creato: https://github.com/m4tt308/release-hub
  - GitHub Pages abilitato con sorgente "GitHub Actions".
  - Primo deploy completato con successo: https://m4tt308.github.io/release-hub/ (HTTP 200).
- A seguito della richiesta "ho vari progetti, tipo verbalia. deve essere
  scaricabile solo il pacchetto.":
  - Verificato via `gh` che `m4tt308/Verbalia` esiste, è **privato** e non ha
    ancora release pubblicate.
  - Aggiunto `Verbalia` a [js/config.js](js/config.js) con i dati reali del repo
    (descrizione e icona lasciate come TODO, da compilare).
  - Rinforzato in [js/app.js](js/app.js) il principio "solo il pacchetto
    scaricabile, mai il sorgente": il sito legge solo `release.assets`
    (mai `zipball_url`/`tarball_url`), più un filtro di sicurezza aggiuntivo
    (`isSourceArchiveAsset`) che esclude eventuali asset chiamati "Source code…".
  - Aggiunta icona di fallback generata (iniziale del nome) per le app senza
    `icon` configurato, per gestire il caso Verbalia (nessuna icona ancora).
  - Migliorato il messaggio d'errore quando un repo è privato/non accessibile
    (404 → invito esplicito a impostare un token nel pannello ⚙️).
  - **Bug trovato e corretto durante il test**: con repo che hanno molte
    release (testato con `cli/cli`, 210 release), la cache in `sessionStorage`
    superava la quota del browser (`QuotaExceededError`) e faceva fallire
    l'intero caricamento pur avendo i dati dalla API. Ora la scrittura in
    cache è in un `try/catch` dedicato: un fallimento della cache (quota
    piena, navigazione privata) non blocca più il rendering.
  - Testato visivamente in Chrome headless: caso repo pubblico con molte
    release (card completa, download button corretto, changelog, storico) e
    caso repo privato senza token (messaggio d'errore corretto).
  - Documentato nel README (sezione rate limit) che repo privati come
    Verbalia richiedono un token fine-grained con permesso "Contents:
    Read-only" nel pannello ⚙️ del sito.
- **Da fare in una prossima sessione (richiede input dell'utente):**
  - Compilare `description` e `icon` di Verbalia in [js/config.js](js/config.js).
  - Elencare gli altri progetti ("vari progetti") da aggiungere alla vetrina (owner/repo, nome, descrizione, icona, eventuale `primaryAssetPattern`).
  - Copiare il template del workflow di release nei repo delle singole app e pubblicare il primo tag SemVer (`v1.0.0`) per popolare la vetrina con dati reali.
  - Decidere se e come dare al pannello ⚙️ (token GitHub) un token fine-grained scoped solo ai repo privati interessati (es. Verbalia), dato che la maggior parte dei repo dell'utente sono privati.
