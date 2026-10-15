# Qualità, test e CI

Tutti i controlli si lanciano dalla root con Make e restituiscono un exit code
diverso da zero in caso di errore, così si possono usare in script e CI.

## Comandi

| Comando | Cosa fa | Modifica file? |
| --- | --- | --- |
| `make check` | `tooling_check` + `lint` + `format_check` + `typecheck` + `api_check` | no |
| `make test` | `test_backend` + `test_frontend` | no (scrive solo i report di coverage) |
| `make format` | Ruff `--fix` e `format`, ESLint `--fix`, Prettier `--write` | sì |
| `make tooling_check` | Test `unittest` del tooling (`tests/test_tooling.py`) | no |
| `make lint` | Ruff su `backend/`, `scripts/`, `tests/`; ESLint con zero warning | no |
| `make format_check` | `ruff format --check`, `prettier --check` | no |
| `make typecheck` | `nuxt typecheck` (vue-tsc) | no |
| `make api_check` | Schema OpenAPI e SDK committati aggiornati | no |
| `make build` | Immagini di produzione backend e frontend | no |

Prima di aprire una PR: `make format && make check && make test`.

## Test del tooling

`tests/test_tooling.py` verifica la repository stessa:

- `make init` genera segreti persistenti e diversi per ogni progetto;
- un `.env` esistente viene completato senza alterare i valori presenti;
- Make propaga i fallimenti di lint e test;
- lo stack di test è isolato e viene ripulito anche dopo un errore.

## Test backend

Vedi [Backend → Test](backend.md#test). In sintesi:

- `make test_backend` esegue la suite in un progetto Compose usa e getta con
  PostgreSQL 17 su `tmpfs` e un `.env` temporaneo; coverage HTML in
  `backend/htmlcov/` e XML;
- `cd backend && uv run --locked pytest` esegue la stessa suite su SQLite in
  memoria, senza Docker.

I test non usano mai il database di sviluppo né il tuo `.env`.

## Test frontend

`make test_frontend` esegue `bun test ./tests`. Vedi
[Frontend → Test](frontend.md#test).

## Stile del codice

| Ambito | Strumento | Configurazione |
| --- | --- | --- |
| Python | Ruff 0.15.16 (lint + format) | `backend/pyproject.toml`: regole `E, W, F, I, B, C4, UP, ARG001`, target `py313`, `alembic/` escluso |
| TypeScript/Vue | ESLint 10 via `@nuxt/eslint` | `frontend/eslint.config.mjs`, `--max-warnings 0` |
| Formattazione frontend | Prettier 3 + plugin Tailwind | `frontend/.prettierrc`, `frontend/.prettierignore` |
| Editor | VS Code | `.vscode/settings.json`, estensioni consigliate in `.vscode/extensions.json` |

## Hook pre-commit (opzionali)

```sh
make pre_commit_install   # installa gli hook Git
make pre_commit_check     # esegue gli hook su tutti i file
```

`.pre-commit-config.yaml` controlla file grandi, TOML/YAML, fine riga e spazi
finali, ed esegue Ruff check e format usando **lo stesso Ruff bloccato** di
`make check` e della CI.

## CI — `.github/workflows/ci.yml`

Eseguita su push su `main`, su ogni pull request e manualmente. Esecuzioni
concorrenti sullo stesso ref vengono annullate.

| Job | Passi |
| --- | --- |
| `tooling` | `make tooling_check init`, validazione di tutti i file Compose con tutti i profili |
| `backend` | `make backend_setup lint_backend`, `ruff format --check`, `uv build` (wheel/sdist), `make test_backend`, upload artefatto `coverage-html` |
| `frontend` | Setup Node/Bun/uv, `make frontend_setup lint_frontend typecheck test_frontend`, `make api_check`, `format:check`, `nuxt build` |
| `production-images` | `make build` |

Non servono segreti, account di deployment o servizi di coverage esterni.

Altri workflow:

- `labeler.yml` — etichetta le PR secondo `.github/labeler.yml`;
- `cd.yml` — pubblicazione manuale delle immagini (vedi [Deployment](deployment.md)).

## Gestione delle dipendenze

Le versioni sono bloccate in modo che ogni installazione sia riproducibile:

| Ambito | Dichiarazione | Lock | Installazione |
| --- | --- | --- | --- |
| Python | `backend/pyproject.toml` | `backend/uv.lock` | `uv sync --locked` |
| Frontend | `frontend/package.json` | `frontend/bun.lock` | `bun install --frozen-lockfile` |
| Runtime | `.python-version`, `.node-version`, `.uv-version`, `.bun-version` | — | usati da CI, Dockerfile e Dev Container |
| Immagini base | Dockerfile e Compose | tag espliciti | — |

Aggiornamenti espliciti:

```sh
make backend_upgrade    # uv lock --upgrade && uv sync --locked
make frontend_upgrade   # bun update
```

Dopo un aggiornamento esegui `make check test build` e committa i lockfile.
Aggiungi una dipendenza con `uv add --project backend <pacchetto>` o
`bun add --cwd frontend <pacchetto>`.

Dependabot (`.github/dependabot.yml`) apre PR settimanali raggruppate per GitHub
Actions, dipendenze uv, dipendenze Bun e immagini Docker di backend e frontend.

Se cambi la versione di Python, Node, uv o Bun, aggiorna insieme il file
`.*-version`, gli `ARG` dei Dockerfile e `.devcontainer/devcontainer.json`.

PostgreSQL è fissato alla major 17: per cambiare major su volumi esistenti segui
la procedura di migrazione di PostgreSQL (`pg_dump`/`pg_upgrade`); non basta
cambiare il tag dell'immagine.
