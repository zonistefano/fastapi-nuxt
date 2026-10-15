# FastAPI + Nuxt — template full-stack

Template e showcase per avviare nuovi progetti web con un backend **FastAPI** e un
frontend **Nuxt 4**. Fornisce un'applicazione già funzionante — autenticazione
completa, area utente, pannello di moderazione, sito marketing multilingua, blog,
documentazione, editor BPMN dimostrativo — e tutta l'infrastruttura di sviluppo:
Docker Compose, migrazioni, client API tipizzato generato da OpenAPI, test isolati,
CI e pubblicazione delle immagini.

L'obiettivo è che un nuovo progetto parta da qui, rinomini, rimuova ciò che non
serve e aggiunga il proprio dominio applicativo nei punti di estensione previsti.

## Stack

| Livello | Tecnologie |
| --- | --- |
| Backend | Python 3.13, FastAPI 0.143, SQLModel 0.0.48, Alembic, Pydantic Settings, [`fastapi-myauth`](https://github.com/zonistefano/fastapi_auth) 1.7.0 |
| Database | PostgreSQL 17 (SQLite in memoria per i test rapidi) |
| Job in background | Celery + Redis, scheduler RedBeat (profilo opzionale) |
| Frontend | Nuxt 4, Vue 3, Nuxt UI 4, Tailwind CSS 4, Pinia, Nuxt Content 3, Nuxt i18n, Vue Flow |
| Client API | `@hey-api/openapi-ts`: tipi e SDK generati dallo schema OpenAPI |
| Tooling | uv, Bun, Ruff, ESLint, Prettier, vue-tsc, pytest, `bun test`, Vitest + `@nuxt/test-utils`, pre-commit |
| Infrastruttura | Docker Compose (sviluppo, test, produzione), GitHub Actions, GHCR, Dev Container |

## Avvio rapido

Requisiti: Python 3, GNU Make, Bash, Docker e Docker Compose ≥ 2.32. Non servono
Node, Bun o un ambiente Python sull'host: le dipendenze vivono nelle immagini.

```sh
make init   # crea .env con segreti generati (non sovrascrive valori esistenti)
make dev    # avvia db, migrazioni, backend e frontend con hot reload
```

| Servizio | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API + Swagger UI | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

Le credenziali dell'amministratore iniziale sono `FIRST_SUPERUSER` e
`FIRST_SUPERUSER_PASSWORD` nel file `.env` generato.

`make help` elenca tutti i comandi disponibili.

## Cosa include

**Backend**
- Autenticazione via `fastapi-myauth`: registrazione, login con password, magic
  link, TOTP con codici di recupero, refresh token con rotazione e revoca,
  conferma email, recupero password, ruoli e superuser, ri-autenticazione recente.
- Modello utente estendibile (`CustomUser`, campo di esempio `language`).
- `CRUDBase` generico, unità di lavoro transazionale condivisa con l'auth.
- Rate limiting (in memoria o Redis), CORS, logging configurabile, health check.
- Migrazioni Alembic con test automatico di coerenza modelli/schema.
- Worker Celery con task periodico di pulizia dei record auth scaduti.
- Moduli `chat`, `editor`, `bpmn`: scheletri pronti per il dominio applicativo.

**Frontend**
- Pagine auth complete (login, signup, magic link, TOTP, recupero e reset password).
- Area impostazioni (profilo, sicurezza/2FA) e pagina di moderazione utenti.
- Landing, pricing, blog, changelog, docs e pagine legali da Nuxt Content, in
  inglese e italiano.
- Client API tipizzato con rinnovo automatico del token.
- Editor BPMN dimostrativo (solo frontend), OG image, `llms.txt`, analytics Umami
  opzionale.

> I moduli backend `chat`, `editor` e `bpmn` sono **punti di estensione vuoti**:
> non espongono API né persistenza. L'editor BPMN del frontend è una demo
> client-side. Vedi [Architettura](docs/architecture.md#stato-dei-moduli).

## Documentazione

| Guida | Contenuto |
| --- | --- |
| [Creare un nuovo progetto](docs/getting-started.md) | Dal template al primo avvio, checklist di personalizzazione |
| [Architettura](docs/architecture.md) | Struttura della repo, servizi, flusso delle richieste, stato dei moduli |
| [Configurazione](docs/configuration.md) | Tutte le variabili d'ambiente e i segreti |
| [Backend](docs/backend.md) | Moduli, modelli, CRUD, transazioni, migrazioni, worker, logging |
| [Autenticazione](docs/authentication.md) | Flussi auth, endpoint, permessi, sessioni, email |
| [Frontend](docs/frontend.md) | Pagine, layout, store, middleware, i18n, contenuti, tema |
| [Client API tipizzato](docs/api-client.md) | Workflow OpenAPI → TypeScript e uso in Nuxt |
| [Tutorial: nuova funzionalità](docs/tutorial-feature.md) | Esempio end-to-end, dal modello alla pagina |
| [Qualità, test e CI](docs/quality.md) | Check, test, pre-commit, GitHub Actions, dipendenze |
| [Deployment](docs/deployment.md) | Immagini di produzione, pubblicazione su GHCR, hosting |

Le istruzioni per gli agenti di codice sono in [AGENTS.md](AGENTS.md) (Codex e
altri) e [CLAUDE.md](CLAUDE.md) (Claude Code, che importa `AGENTS.md`).

## Comandi principali

```sh
make dev            # stack core con hot reload
make dev_workers    # + Redis, worker Celery e scheduler
make dev_tools      # + Redis, pgAdmin, Flower, mailcatcher
make setup          # installa le dipendenze locali (uv + Bun) per IDE e check
make check          # lint, formattazione, tipi, verifica client API
make test           # test backend (PostgreSQL usa e getta) + test frontend
make api_generate   # rigenera openapi.json, tipi e SDK del frontend
make backend_makemigrations MESSAGE="descrizione"
make build          # immagini di produzione
make dev_down       # ferma lo stack, conserva i dati
make dev_clean      # ferma lo stack ed ELIMINA i volumi del database
```

## Licenza

[MIT](LICENSE). Aggiorna il titolare del copyright nei progetti derivati.
