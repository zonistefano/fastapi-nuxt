@AGENTS.md

## Note specifiche per Claude Code

- Le istruzioni condivise con gli altri agenti sono in `AGENTS.md` (importato
  sopra): modifica lì le regole comuni, non duplicarle in questo file.
- Prima di lavorare su un'area leggi la guida corrispondente in `docs/`; per una
  nuova funzionalità segui `docs/tutorial-feature.md`.
- Usa il debugger o il server locale solo se richiesto; per verificare il backend
  basta `cd backend && uv run --locked pytest`.
- Per avviare l'app e verificarla nel browser: `make dev`, frontend su
  http://localhost:3000, API su http://localhost:8000/docs. Le credenziali admin
  sono in `.env`: chiedi all'utente invece di leggere il file.
