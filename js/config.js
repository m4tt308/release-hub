/**
 * Elenco delle app da mostrare nella vetrina.
 * Ogni app corrisponde a UN repository GitHub separato che usa le GitHub Releases.
 *
 * owner                -> il tuo username o la tua organizzazione GitHub
 * repo                 -> nome del repository SORGENTE dell'app (quello con il codice)
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
 * releasesOwner/releasesRepo (opzionali) -> se il repo sorgente (owner/repo) è PRIVATO ma vuoi
 *   comunque che chiunque possa scaricare il pacchetto senza token (es. per darlo a colleghi),
 *   pubblica i pacchetti come Release in un repository PUBBLICO separato (es. questo stesso
 *   release-hub) e indicalo qui: la vetrina leggerà le release da releasesOwner/releasesRepo
 *   invece che da owner/repo. Il codice sorgente resta privato in owner/repo, non viene mai
 *   toccato: solo il file compilato finisce nel repo pubblico.
 * tagPrefix (opzionale, richiede releasesRepo) -> se più app condividono lo stesso releasesRepo
 *   (es. tutte pubblicano in release-hub), usa un prefisso nei tag per distinguerle
 *   (es. "mail-editor-v1.0.0") e indicalo qui ("mail-editor-"): la vetrina mostra solo le
 *   release con quel prefisso e lo toglie dalla versione mostrata.
 *
 * NB: senza releasesOwner/releasesRepo, un repo sorgente privato (come la maggior parte dei
 * tuoi progetti) richiede che chi visita la vetrina imposti un token nel pannello ⚙️ (un
 * Personal Access Token fine-grained con permesso "Contents: Read-only" su quel repository).
 * Senza token, la card dell'app mostra un errore "repository non trovato o privato" — utile
 * quando VUOI che il pacchetto resti riservato (es. Verbalia, a licenza proprietaria).
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
  },
  {
    owner: "m4tt308",
    repo: "Mail-Editor",
    displayName: "Mail Editor",
    description: "Editor di mail aziendali.",
    // TODO: aggiungi un URL icona (es. raw.githubusercontent.com/m4tt308/Mail-Editor/main/assets/icon.png).
    icon: "",
    primaryAssetPattern: "\\.exe$",
    includePrerelease: false,
    // Mail Editor va dato liberamente ai colleghi: pacchetto pubblicato qui (solo il file
    // compilato), il sorgente resta privato nel repo Mail-Editor.
    releasesOwner: "m4tt308",
    releasesRepo: "release-hub",
    tagPrefix: "mail-editor-"
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

// Riusato anche lato server da api/download.js (Node, CommonJS) per validare
// quali owner/repo sono autorizzati a passare dal proxy di download.
// In browser `module` non esiste: il controllo evita un ReferenceError.
if (typeof module !== "undefined") module.exports = APPS_CONFIG;
