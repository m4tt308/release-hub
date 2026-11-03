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
- **2026-11-03** — L'utente ha caricato (nel pannello ⚙️ del sito, lato
  browser) un token personale con accesso di sola lettura ai contenuti di
  `Verbalia` e `Mail-Editor`.
- **2026-11-03** — "Come si fa a pubblicare? Nel caso occupatene tu." →
  richiesta di gestire in autonomia la pubblicazione delle release per i
  repo-app.
- **2026-11-03** — Confermato/ribadito: `release-hub` non deve mai contenere
  codice sorgente delle app, solo i pacchetti compilati.
- **2026-11-03** — Un collega a cui è stato girato il link di `release-hub`
  non riusciva a scaricare il pacchetto di Mail-Editor (perché il repo
  sorgente è privato e lui non ha un token). Richiesto di far funzionare il
  download pubblico per chi non ha un token GitHub.

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
- A seguito di "ho caricato un token personale con accesso RO a contents di
  Verbalia e mail-editor":
  - Verificato via `gh` che `m4tt308/Mail-Editor` esiste, è privato,
    descrizione "Editor di mail aziendali", nessuna release pubblicata.
  - Aggiunta `Mail-Editor` a [js/config.js](js/config.js) (manca solo l'icona, TODO).
  - Nota: il token è salvato solo nel `localStorage` del browser dell'utente
    (pannello ⚙️ del sito), non è mai arrivato/visibile in questa sessione e
    non serve consegnarlo altrove.
  - Entrambe le app (Verbalia, Mail-Editor) non hanno ancora release: con il
    token impostato correttamente mostreranno "Nessuna release pubblicata
    ancora" (comportamento atteso, non un errore) finché non viene pubblicato
    un tag SemVer in quei repo.
- A seguito di "come si fa a pubblicare? nel caso occupatene tu" (nota: questo
  file è nel repository **pubblico** `release-hub`, quindi qui sotto restano
  solo informazioni di processo, senza dettagli interni/proprietari sui
  singoli repo-app — quelli vanno negli handoff privati di ciascun progetto):
  - Prima di automatizzare alla cieca, verificato (consultando brevemente,
    solo in locale, i repository delle due app) come si builda ciascuna.
  - **Verbalia** ha una licenza d'uso proprietaria e un processo di build
    pensato per essere eseguito dall'utente stesso, non in una pipeline CI
    condivisa: per questo **non** è stata creata automazione di build/release
    per questo repo. Confermato con l'utente: continuerà a produrre lui il
    pacchetto, e quando me lo fornirà mi occuperò solo di creare il tag e
    caricarlo come GitHub Release.
  - Confermato inoltre con l'utente che i pacchetti di Verbalia non devono
    essere raggiungibili pubblicamente dalla vetrina: essendo il repo
    privato, un visitatore senza un proprio token di accesso vede solo un
    messaggio "repository non trovato o privato" e nessun link di download —
    requisito già soddisfatto dall'architettura esistente, nessuna modifica
    necessaria.
  - **Mail-Editor** ha invece un processo di build semplice ed eseguibile
    senza problemi su un runner Windows standard di GitHub Actions: aggiunto
    `.github/workflows/release.yml` al repo `m4tt308/Mail-Editor` (build +
    pubblicazione Release con changelog automatico ad ogni tag `v*.*.*`).
  - Bloccato dal classificatore di sicurezza di Claude Code nel tentare di
    impostare da solo i permessi di scrittura delle Actions sul repo
    (categoria "concessione di permessi"): l'utente l'ha fatto manualmente da
    Settings → Actions → General → Workflow permissions.
  - Creato e pushato il tag `v1.0.0` su `Mail-Editor`: workflow eseguito con
    successo, prima Release pubblicata con l'eseguibile allegato — verificato
    via API che struttura dati e link di download combaciano con quanto si
    aspetta [js/app.js](js/app.js).
  - Durante la stesura di questa stessa voce, un primo tentativo di commit
    conteneva dettagli tecnici interni di Verbalia (meccanismo di licenza,
    modello di build) non adatti a un repository pubblico: bloccato dal
    classificatore di sicurezza prima della pubblicazione, poi riscritto in
    forma generica come sopra. **Promemoria per le prossime sessioni**:
    questo file è pubblico, non riportarci segreti, dettagli di sicurezza o
    meccanismi interni dei singoli progetti.
- A seguito di "perché se giro il link al mio collega non gli permette di
  scaricare i pacchetti?":
  - Causa: il repo sorgente di Mail-Editor è privato, quindi senza un token
    (salvato solo nel browser di chi lo ha impostato) la vetrina non riesce a
    leggerne le release — per chi non ha token, sembra che il repo non
    esista.
  - Chiesto all'utente come vuole distribuire i pacchetti delle app non
    riservate: confermata l'opzione "pubblica solo il pacchetto, mai il
    sorgente" in un posto pubblico separato dal repo sorgente.
  - Implementato un meccanismo generico in [js/config.js](js/config.js)/[js/app.js](js/app.js):
    un'app può avere `releasesOwner`/`releasesRepo` (repo pubblico diverso da
    quello sorgente, da cui leggere le release) e `tagPrefix` (per
    distinguere le release di più app che condividono lo stesso
    `releasesRepo`). Il codice sorgente resta sempre nel repo privato
    originale, invariato.
  - Promosso manualmente (via `gh release create`, scaricando l'asset dalla
    release privata già esistente e ricaricandolo) il pacchetto
    `S2E Mail Editor.exe` v1.0.0 come release pubblica
    `mail-editor-v1.0.0` nello stesso repo `release-hub` — nessun sorgente
    coinvolto, solo il file compilato.
  - Configurato `Mail-Editor` in [js/config.js](js/config.js) per leggere da
    lì (`releasesOwner/releasesRepo: m4tt308/release-hub`,
    `tagPrefix: "mail-editor-"`). Verificato via API che l'asset sia
    scaricabile con HTTP 200 **senza alcuna autenticazione**, e testato
    visivamente che la card di Mail-Editor ora si popola correttamente
    mentre quella di Verbalia resta protetta come previsto.
  - Nota: questa prima pubblicazione pubblica è stata fatta a mano da me
    (ho accesso sia al repo privato che a `release-hub`). Per rendere
    **automatico** anche il prossimo tag (senza bisogno del mio intervento
    manuale ogni volta), il workflow `.github/workflows/release.yml` di
    Mail-Editor andrebbe modificato per pubblicare direttamente su
    `release-hub` invece che sul proprio repo: servirebbe un Personal Access
    Token fine-grained con permesso "Contents: Read and write" limitato a
    `release-hub`, creato dall'utente (non è possibile crearlo via API) e
    salvato come secret nel repo Mail-Editor. Non ancora fatto: per ora ogni
    nuova release di Mail-Editor va promossa a mano (chiedendo a me).
- **Da fare in una prossima sessione (richiede input dell'utente):**
  - Decidere se impostare il token per l'automazione completa di Mail-Editor descritta sopra, oppure continuare a promuovere ogni release a mano.
  - Quando l'utente builda un pacchetto di Verbalia sulla sua macchina
    fidata, darmelo (percorso del file + numero di versione) perché crei
    tag + GitHub Release e carichi l'asset manualmente (`gh release create`).
  - Compilare `description`/`icon` mancanti (Verbalia description+icon, Mail-Editor icon) in [js/config.js](js/config.js).
  - Elencare gli altri progetti ("vari progetti") da aggiungere alla vetrina (owner/repo, nome, descrizione, icona, eventuale `primaryAssetPattern`).
