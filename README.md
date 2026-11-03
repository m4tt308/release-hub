# Release Hub

Piattaforma gratuita, 100% statica, per distribuire e mostrare lo storico delle
release delle tue applicazioni personali, usando GitHub come unico backend
(storage binari + changelog + versionamento) e GitHub Pages come hosting del
sito vetrina.

Nessun server, nessun database, nessun costo.

## A. Architettura

```
                 ┌─────────────────────────┐
                 │   Repo "app-foo"         │   ogni app ha il SUO repo
                 │   - codice sorgente      │   indipendente, con:
                 │   - tag SemVer (v1.2.0)  │   - GitHub Releases (asset .exe/.zip/.deb)
                 │   - .github/workflows/   │   - changelog generato dai commit
                 │     release.yml          │   - CI/CD che pubblica la release al tag
                 └─────────────┬────────────┘
                               │ GitHub REST API (pubblica, read-only)
                               ▼
                 ┌─────────────────────────┐
                 │   Repo "release-hub"    │   questo repository:
                 │   (questo progetto)     │   - index.html / css / js statici
                 │   - index.html          │   - nessuna build, nessun backend
                 │   - js/app.js           │   - fetch diretto alle API GitHub
                 │   - js/config.js        │     dal browser dell'utente
                 └─────────────┬────────────┘
                               │ hosting
                               ▼
                 GitHub Pages (o Vercel) — URL pubblico della vetrina
```

**Perché due tipi di repository?**

- **Repo per app** (uno per ciascuna applicazione, es. `app-foo`, `app-bar`):
  contengono il codice sorgente e usano le **GitHub Releases** come
  deposito dei binari compilati e del changelog. Il versionamento segue
  **SemVer** (`vMAJOR.MINOR.PATCH`, es. `v1.4.2`).
- **Repo vetrina** (questo, es. `release-hub`): contiene solo il sito statico
  che legge via API le release di tutti gli altri repo e le mostra in una
  dashboard unica, con pulsante di download, storico e contatore download.

Questa separazione ti permette di aggiungere nuove app in futuro semplicemente
aggiungendo una riga a [js/config.js](js/config.js), senza toccare il sito.

### Perché non serve un backend

Le [GitHub REST API](https://docs.github.com/en/rest/releases/releases) sono
pubbliche e gratuite per i repository pubblici:
- `GET /repos/{owner}/{repo}/releases` → elenco release, changelog (`body`),
  asset con URL di download diretto e `download_count` per asset.

Il sito chiama queste API direttamente dal browser dell'utente finale:
zero costi di hosting backend, zero mantenimento di un server.

**Limite da conoscere:** le chiamate API non autenticate sono limitate a
60 richieste/ora **per indirizzo IP**. Per un uso personale (vetrina con
poche app, traffico basso/moderato) è sufficiente, aiutato dalla cache lato
browser di 5 minuti già implementata in [js/app.js](js/app.js). Se prevedi
più traffico o più app, puoi:
1. Far inserire a chi visita il sito un **Personal Access Token** fine-grained
   di sola lettura sui repository pubblici, tramite il pannello ⚙️ del sito
   (sale a 5000 richieste/ora, il token resta solo nel `localStorage` del
   browser e non viene mai inviato a terzi) — adatto se sei tu l'unico
   utente del sito;
2. In alternativa, per un sito pubblico a più visitatori, aggiungere in futuro
   una piccola funzione serverless (es. Vercel Edge Function) che faccia da
   proxy cache verso le API GitHub usando un token lato server — non incluso
   qui perché non necessario per uso personale, ma è il passo successivo se
   la vetrina diventa pubblica e molto visitata.

## B. Codice del sito (vetrina)

File già creati in questo repository:

- [index.html](index.html) — struttura della pagina
- [css/style.css](css/style.css) — tema scuro, card responsive
- [js/config.js](js/config.js) — **elenco delle tue app** (da modificare)
- [js/app.js](js/app.js) — logica: fetch GitHub API, cache, rendering,
  gestione rate limit, sanitizzazione del changelog in markdown

**Hosting: Vercel, non più GitHub Pages.** Dato che il tracciamento dei
download (sezione E) richiede funzioni serverless, che GitHub Pages non
supporta, il sito è ospitato solo su Vercel. Il vecchio link
`https://m4tt308.github.io/release-hub/` è stato disattivato per evitare che
qualcuno lo usi per sbaglio (i download lì non avrebbero più funzionato,
puntando a `/api/download` che su Pages non esiste).

Caratteristiche implementate:
- Card per ogni app con icona, nome, descrizione.
- Ultima versione (badge) + pulsante di download diretto sull'asset giusto
  (configurabile via `primaryAssetPattern` in `config.js`, es. solo `.exe`).
- Storico completo delle release in un pannello a comparsa, con changelog
  (renderizzato da Markdown) e link di download per singolo asset con il suo
  contatore di download.
- Contatore totale dei download per app (somma di tutti gli asset di tutte
  le release).
- Cache in `sessionStorage` (5 minuti) per non consumare rate limit ad ogni
  refresh della pagina.
- Pannello opzionale per inserire un token GitHub personale (solo client-side).

Nessuna build richiesta: è vanilla HTML/CSS/JS, pubblicabile così com'è.

## C. Workflow GitHub Actions per le release automatiche

File: [templates/app-repo-template/.github/workflows/release.yml](templates/app-repo-template/.github/workflows/release.yml)

Questo file **non va in questo repository**, ma copiato in `.github/workflows/release.yml`
dentro **ciascun repository delle tue app**. Si attiva ad ogni push di un tag
SemVer (`v*.*.*`) e:
1. Fa il checkout del codice (con storia completa, per il changelog).
2. Determina se è una pre-release dal nome del tag (`-alpha`, `-beta`, `-rc`).
3. Esegue lo step di build (contiene esempi commentati per Node/Electron,
   Python/PyInstaller o script generico — scegli quello adatto e rimuovi gli altri).
4. Crea la GitHub Release con `softprops/action-gh-release`, changelog
   auto-generato dai commit/PR dal tag precedente, e allega tutti i file
   presenti in `dist/`.

Istruzioni d'uso dettagliate nel [README del template](templates/app-repo-template/README.md).

## D. Procedura passo-passo per la prima configurazione

### 1. Crea il repository della vetrina
```bash
# in questa cartella
git init
git add .
git commit -m "Setup iniziale Release Hub"
gh repo create release-hub --public --source=. --remote=origin --push
```
(oppure crea il repo su github.com e collega il remote manualmente)

### 2. Configura le tue app
Apri [js/config.js](js/config.js) e sostituisci gli oggetti di esempio con i
tuoi repository reali: `owner`, `repo`, `displayName`, `description`, `icon`
(puoi puntare a un'immagine dentro il repo dell'app via
`raw.githubusercontent.com`), ed eventualmente `primaryAssetPattern`.

### 3. Hosting
Il sito è ospitato su Vercel (vedi sezione E più sotto), non su GitHub Pages:
serve una piattaforma con funzioni serverless per il tracciamento dei
download. Collega il repo a Vercel prima di procedere con i passi successivi.

### 4. Prepara ciascun repository delle app
Per ogni applicazione che vuoi distribuire:
1. Crea (o usa) il repository su GitHub, pubblico.
2. Copia `templates/app-repo-template/.github/workflows/release.yml` in
   `.github/workflows/release.yml` dentro quel repo.
3. Adatta lo step di build al tuo linguaggio/toolchain (vedi i blocchi
   commentati nel file).
4. Abilita i permessi di scrittura per le Actions:
   **Settings → Actions → General → Workflow permissions → "Read and write permissions"**.

### 5. Pubblica la prima release
```bash
# dentro il repo dell'app
git tag v1.0.0
git push origin v1.0.0
```
Il workflow builda e pubblica automaticamente la GitHub Release con asset e
changelog. Dopo pochi secondi comparirà nella vetrina (ricarica la pagina:
la cache dura al massimo 5 minuti).

### 6. (Opzionale) Token GitHub per più richieste/ora
Se noti il messaggio di rate limit nella vetrina, apri il sito, clicca
l'icona ⚙️ in alto a destra e inserisci un **Personal Access Token
fine-grained** con permesso di sola lettura su repository pubblici
("Public Repositories (read-only)"). Resta salvato solo nel tuo browser.

### 7. Aggiungere una nuova app in futuro
Basta aggiungere un nuovo oggetto in [js/config.js](js/config.js) e fare
commit/push: nessuna altra modifica necessaria.

## E. Tracciamento dei download (IP di chi scarica)

GitHub non espone **chi** scarica un asset di una release (`download_count` è
solo un contatore aggregato, il download è anonimo e non richiede login). Per
sapere almeno l'**IP** di chi scarica, i link di download non puntano più
direttamente a `browser_download_url` ma a una funzione serverless propria
([api/download.js](api/download.js)) che legge l'IP dalla richiesta, lo logga
e poi fa un redirect (302) al vero file su GitHub.

Questo richiede un hosting che supporti funzioni serverless: **GitHub Pages
non basta** (è solo hosting statico). Usa [Vercel](https://vercel.com):

### 1. Collega il repo a Vercel
Su vercel.com → "Add New Project" → importa questo repository GitHub. Vercel
rileva automaticamente [index.html](index.html) come sito statico e le
funzioni in [api/](api) (`api/download.js`, `api/logs.js`) come serverless
function, senza build step. Ad ogni push su `main` il sito si ridistribuisce
da solo.

### 2. Configura lo storage dei log (Upstash Redis)
Su [Upstash](https://upstash.com) (piano free) crea un database Redis, poi su
Vercel → Project Settings → Environment Variables aggiungi:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

(li trovi nella dashboard del database Upstash, sezione "REST API"). Se
l'integrazione Upstash è disponibile nel marketplace di Vercel, queste
variabili vengono impostate automaticamente collegando il database al progetto.

### 3. (Opzionale ma consigliato) Token GitHub lato server
Ogni download fa una chiamata server-side a GitHub per risolvere l'URL reale
dell'asset: senza token condivide il limite di 60 richieste/ora per IP del
datacenter Vercel. Aggiungi una variabile d'ambiente `GITHUB_TOKEN` con un
Personal Access Token fine-grained, sola lettura sui repository pubblici
(sale a 5000 richieste/ora).

### 4. Imposta un token admin per consultare i log
Aggiungi una variabile d'ambiente `ADMIN_TOKEN` (una stringa lunga a caso, es.
generata con `openssl rand -hex 32`). Poi apri, solo tu:
```
https://<tuo-sito>.vercel.app/api/logs?token=<ADMIN_TOKEN>
```
per vedere una tabella con data, IP, repo, asset e user-agent di ogni
download (ultimi 200 per default; `&limit=2000` per vederne di più,
`&format=json` per la risposta grezza).

**Limiti da conoscere:**
- L'IP non è un'identità certa: NAT/VPN/reti aziendali fanno condividere lo
  stesso IP a più persone, e un IP può cambiare da una sessione all'altra.
- L'IP è un dato personale (GDPR): se il sito è pubblico, valuta se serve
  un'informativa privacy minima, e non condividere il link `/api/logs` con
  nessuno (il token passa in query string, quindi finisce nella history del
  browser di chi apre il link).
- Senza `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configurate, i
  download funzionano comunque (il redirect avviene sempre): si perde solo
  la tracciabilità, senza rompere nulla.
