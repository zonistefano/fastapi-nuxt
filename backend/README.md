# Backend

API FastAPI del template (pacchetto Python `app`). Esegui i comandi dalla root
della repository.

```sh
make dev_backend      # db + migrazioni + API con reload su http://localhost:8000
make lint_backend
make test_backend     # PostgreSQL usa e getta
uv run --locked pytest   # da backend/: loop veloce su SQLite
make backend_makemigrations MESSAGE="descrizione"
```

Documentazione:

- [Backend](../docs/backend.md) — moduli, modelli, CRUD, transazioni, migrazioni, worker
- [Autenticazione](../docs/authentication.md)
- [Configurazione](../docs/configuration.md)
- [Tutorial: nuova funzionalità](../docs/tutorial-feature.md)
