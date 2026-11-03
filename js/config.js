/**
 * Elenco delle app da mostrare nella vetrina.
 * Ogni app corrisponde a UN repository GitHub separato che usa le GitHub Releases.
 *
 * owner                -> il tuo username o la tua organizzazione GitHub
 * repo                 -> nome del repository dell'app
 * displayName          -> nome mostrato in vetrina
 * description          -> breve descrizione
 * icon                 -> URL di un'immagine (puoi usare raw.githubusercontent.com) o un'emoji come fallback
 * primaryAssetPattern  -> (opzionale) regex per scegliere l'asset del pulsante "Download" principale
 *                         tra quelli dell'ultima release (es. solo i .exe, o solo i .dmg)
 * includePrerelease    -> (opzionale, default false) se true considera anche le pre-release come "ultima versione"
 */
const APPS_CONFIG = [
  {
    owner: "tuo-username-github",
    repo: "nome-primo-repo-app",
    displayName: "Nome App 1",
    description: "Breve descrizione dell'applicazione e a cosa serve.",
    icon: "https://raw.githubusercontent.com/tuo-username-github/nome-primo-repo-app/main/assets/icon.png",
    primaryAssetPattern: "\\.exe$",
    includePrerelease: false
  },
  {
    owner: "tuo-username-github",
    repo: "nome-secondo-repo-app",
    displayName: "Nome App 2",
    description: "Breve descrizione della seconda applicazione.",
    icon: "https://raw.githubusercontent.com/tuo-username-github/nome-secondo-repo-app/main/assets/icon.png",
    primaryAssetPattern: "\\.zip$",
    includePrerelease: false
  }
  // Aggiungi qui altre app, una per oggetto.
];
