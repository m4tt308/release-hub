# Template workflow di release per i repository delle app

Copia la cartella `.github/workflows/release.yml` contenuta qui dentro il
repository di **ogni singola applicazione** che vuoi distribuire tramite il
Release Hub (non va messa nel repository della vetrina).

## Come personalizzarlo

1. Scegli il blocco di build adatto al tuo stack (Node/Electron, Python, generico)
   nel file `release.yml` e decommentalo, rimuovendo gli altri.
2. Assicurati che il risultato della build (file `.exe`, `.zip`, `.deb`, `.dmg`, ...)
   finisca nella cartella `dist/` del workspace — è quella che viene allegata
   automaticamente alla Release.
3. Nel repo dell'app assegna alle Actions il permesso di scrittura:
   **Settings → Actions → General → Workflow permissions → "Read and write permissions"**
   (necessario perché il workflow usa `permissions: contents: write`).

## Come si usa

```bash
# dentro il repo dell'app, dopo aver fatto commit delle modifiche
git tag v1.2.0
git push origin v1.2.0
```

Il push del tag avvia il workflow, che crea una GitHub Release con:
- Changelog generato automaticamente dai commit/PR da quando hai creato il tag precedente.
- Gli asset compilati come file allegati, pronti per essere scaricati dalla vetrina.
- Flag di pre-release automatico se il tag contiene `-alpha`, `-beta` o `-rc`
  (es. `v2.0.0-beta.1`).
