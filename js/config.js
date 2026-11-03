/**
 * Elenco delle app da mostrare nella vetrina.
 * Ogni app corrisponde a UN repository GitHub separato che usa le GitHub Releases.
 *
 * owner                -> il tuo username o la tua organizzazione GitHub
 * repo                 -> nome del repository dell'app
 * displayName          -> nome mostrato in vetrina
 * description          -> breve descrizione
 * icon                 -> URL di un'immagine (puoi usare raw.githubusercontent.com) o lascia vuoto
 *                         per un'icona generata automaticamente dall'iniziale del nome
 * primaryAssetPattern  -> (opzionale) regex per scegliere l'asset del pulsante "Download" principale
 *                         tra quelli dell'ultima release (es. solo i .exe, o solo i .zip).
 *                         In ogni caso vengono mostrati/scaricabili SOLO i pacchetti allegati alla
 *                         release (release.assets), mai il codice sorgente del repository.
 * includePrerelease    -> (opzionale, default false) se true considera anche le pre-release come "ultima versione"
 *
 * NB: se il repository è privato (come la maggior parte dei tuoi progetti), per vedere le sue
 * release nella vetrina serve impostare un token nel pannello ⚙️ del sito: un Personal Access
 * Token fine-grained con permesso "Contents: Read-only" limitato a quel repository. Senza token,
 * la card dell'app mostrerà un errore "repository non trovato o privato".
 */
const APPS_CONFIG = [
  {
    owner: "m4tt308",
    repo: "Verbalia",
    displayName: "Verbalia",
    // TODO: aggiungi una breve descrizione reale di Verbalia.
    description: "",
    // TODO: aggiungi un URL icona (es. raw.githubusercontent.com/m4tt308/Verbalia/main/assets/icon.png).
    icon: "",
    primaryAssetPattern: null,
    includePrerelease: false
  }

  // Aggiungi qui le tue altre app, una per oggetto, sul modello sopra. Esempio:
  // {
  //   owner: "m4tt308",
  //   repo: "nome-repo-app",
  //   displayName: "Nome App",
  //   description: "Breve descrizione.",
  //   icon: "",
  //   primaryAssetPattern: "\\.exe$",
  //   includePrerelease: false
  // },
];
