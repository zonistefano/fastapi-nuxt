# Istruzioni per agenti di codice

Questa repository è un **template full-stack** (FastAPI + Nuxt 4) da cui nascono
nuovi progetti. Ogni modifica deve lasciarla funzionante, coerente e
documentata: chi la copia eredita anche i difetti.

La documentazione per umani è in `docs/` (indice nel `README.md`). Leggi la guida
pertinente prima di cambiare un'area: `docs/backend.md`, `docs/frontend.md`,
`docs/authentication.md`, `docs/api-client.md`, `docs/configuration.md`,
`docs/tutorial-feature.md` (esempio end-to-end verificato).

## Mappa rapida

| Percorso | Contenuto |
| --- | --- |
| `backend/app/main.py` | `create_app()`: middleware, router, `operationId`, health check |
| `backend/app/router.py`, `backend/app/models.py` | Registrazione di router e modelli di ogni modulo |
| `backend/app/src/<modulo>/` | Moduli di dominio: `api/`, `models/`, `crud/`, `config.py`, `service.py` |
| `backend/app/src/auth/` | Integrazione `fastapi-myauth` 1.6.0, `CustomUser` |
| `backend/app/crud.py`, `backend/app/deps.py` | `CRUDBase`, `SessionDep` |
| `backend/alembic/versions/` | Migrazioni |
| `backend/tests/` | pytest (`conftest.py`: fixture `db`, `client`) |
| `frontend/app/` | Sorgenti Nuxt (pages, layouts, components, stores, middleware, plugins) |
| `frontend/app/api/generated/`, `frontend/openapi.json` | **Generati** dal backend |
| `frontend/i18n/locales/{en,it}.ts` | Testi UI |
| `frontend/content/{en,it}/` | Contenuti Nuxt Content |
| `scripts/init.py`, `.env.example` | Configurazione e segreti |
| `Makefile` | Punto d'ingresso per tutti i comandi (`make help`) |

Stato reale: `auth` è completo. I moduli backend `chat`, `editor` e `bpmn` sono
**scheletri vuoti**; l'editor BPMN del frontend è una demo solo client-side. Non
descriverli né usarli come se avessero funzionalità che non hanno.

## Comandi

Usa sempre i target `make` dalla root e gli strumenti fissati (uv, Bun). Mai `pip`,
`npm`, `yarn` o `pnpm`.

```sh
make setup            # installa le dipendenze bloccate (uv sync --locked, bun install --frozen-lockfile)
make format           # applica Ruff, ESLint --fix, Prettier
make check            # tooling, lint, formattazione, typecheck, api_check (non modifica file)
make test             # test backend su PostgreSQL usa e getta (Docker) + test frontend (Bun + Vitest)
make api_generate     # rigenera openapi.json, tipi e SDK frontend
make backend_makemigrations MESSAGE="descrizione"   # richiede Docker
```

Senza Docker:

```sh
cd backend && uv run --locked pytest             # stessa suite, SQLite in memoria
cd backend && uv run --locked pytest tests/api/v1/test_auth.py -k refresh
cd frontend && bun run test && bun run typecheck && bun run lint
```

`make api_generate` e `make api_check` non richiedono servizi in esecuzione.

## Regole inderogabili

1. **Non modificare a mano** `frontend/app/api/generated/` né `frontend/openapi.json`.
   Dopo ogni modifica a rotte, parametri o modelli esposti dal backend esegui
   `make api_generate` e includi gli artefatti nello stesso cambiamento.
2. **Ogni modifica a un modello tabella richiede una migrazione Alembic.**
   `tests/test_migrations.py` fallisce se schema e modelli divergono. Non
   modificare né eliminare le revisioni esistenti: aggiungine una nuova. Rileggi
   sempre il file generato da autogenerate. Se Docker non è disponibile, scrivi la
   revisione a mano seguendo lo stile di quelle esistenti e dillo esplicitamente.
3. **Segreti**: non leggere, stampare, modificare o committare `.env`. Non inserire
   segreti reali in codice, test o documentazione. Non cambiare la logica di
   generazione di `SECRET_KEY`/`TOTP_SECRET_KEY` in `scripts/init.py`.
4. **Comandi distruttivi**: non eseguire `make dev_clean`, `docker compose down
   --volumes`, `make clean` o reset di Git senza richiesta esplicita.
5. **Versioni fissate**: non aggiornare `fastapi-myauth` (`==1.6.0`), FastAPI,
   SQLModel, i file `.*-version` o le immagini base senza richiesta. Aggiungi
   dipendenze con `uv add --project backend …` / `bun add --cwd frontend …` e
   committa i lockfile.
6. **Sicurezza auth**: non reimplementare meccanismi già forniti da
   `fastapi-myauth` (token, hash, TOTP, sessioni). Non indebolire validazioni,
   rate limit, CORS (niente `*`) o controlli di permesso per far passare un test.
7. Se aggiungi una variabile d'ambiente, aggiornala in tutti i punti: classe
   `BaseSettings`, `.env.example`, `SECRET_NAMES` in `scripts/init.py` se è un
   segreto, `backend/tests/conftest.py` e `backend/scripts/export_openapi.py` se è
   obbligatoria, `docker-compose.yml` se serve al frontend, `docs/configuration.md`.

## Convenzioni backend

- Python 3.13, tipi moderni (`list[str]`, `X | None`, generics PEP 695 come in
  `CRUDBase`). Ruff è l'unico linter/formatter (`backend/pyproject.toml`).
- Nuovo dominio = nuovo modulo in `app/src/<nome>/` con la stessa struttura degli
  scheletri, registrato in `app/router.py` **e** `app/models.py`. I modelli vanno
  esportati da `models/__init__.py`.
- Modelli SQLModel: `XBase`, `X(XBase, table=True)`, `XCreate`, `XUpdate` (campi
  opzionali), `XRead`. Chiave esterna verso utenti: `foreign_key="user.id"`.
  Timestamp con fuso: `datetime.now(UTC)`. Campi impostati dal server (es.
  proprietario) non devono stare in `XCreate`.
- Endpoint:
  - sessione: `db: SessionDep` da `app.deps` (transazione per richiesta: commit a
    fine richiesta, rollback su eccezione; non chiamare `db.commit()` negli
    endpoint);
  - utente: `Annotated[CustomUser, Depends(CurrentUser)]`; ruoli:
    `Depends(RequireRole(["admin"]))`, da `app.src.auth.api.deps`;
  - dichiara sempre il tipo di ritorno con un modello `*Read` (mai la tabella);
  - registra il router con `tags=[...]`; i nomi funzione devono essere unici nel
    tag perché l'`operationId` è `{tag}_{funzione}` e diventa il nome nell'SDK;
  - risorse altrui → `404`, non `403`, se l'esistenza non deve trapelare;
  - rotte costose o pubbliche: `@rate_limit(limit=..., window_seconds=...)`.
- Accesso ai dati tramite `CRUDBase` o sottoclassi in `crud/`; per scritture
  personalizzate usa `persist(db, obj)` di `fastapi_myauth.transactions`.
  Fuori dalle richieste (script, Celery) usa `with transaction(session):`.
- Lavoro lento o esterno → task Celery in `app/worker/`.
- Logging con `logging.getLogger(__name__)`, mai `print` nel codice applicativo.
- Test: aggiungi test in `backend/tests/` per ogni comportamento nuovo, usando le
  fixture `client`/`db`; ottieni token con `POST /login/signup` + `POST /login/oauth`
  (vedi `tests/api/v1/test_auth.py`). Copri anche il caso non autenticato e quello
  di un altro utente.

## Convenzioni frontend

- Nuxt 4 con `srcDir` `frontend/app/`; componenti Nuxt UI 4 (`U*`) e Tailwind 4.
  Preferisci i componenti Nuxt UI a markup personalizzato.
- TypeScript in `<script setup lang="ts">`. Prettier: niente punto e virgola,
  doppi apici. ESLint con zero warning.
- API: importa funzioni e tipi da `~/api/generated`, passa `client: $api`
  (autenticato) o `client: $publicApi` (login, signup, refresh, recupero,
  contatti). Non scrivere wrapper `fetch` manuali né duplicare i tipi del contratto.
- Le funzioni SDK rigettano sugli errori HTTP: gestiscili con `try/catch` e
  `useToast()`.
- Stato di sessione solo negli store `useAuthStore()` / `useTokenStore()`.
- Pagine protette: `definePageMeta({ layout: "dashboard", middleware: ["authenticated"] })`;
  amministrative: `middleware: ["moderator"]`. Il controllo vero resta nel backend.
- **Ogni testo visibile passa da i18n**: aggiungi la chiave sia in `en.ts` sia in
  `it.ts`. Link interni con `useLocalePath()`. Fuori dai componenti usa
  `translate` da `@/utilities`.
- `app/utilities/` non è auto-importata: `import { … } from "@/utilities"`.
- Test: per ogni logica nuova (utility, store, composable, middleware, plugin)
  aggiungi test in `frontend/tests/` con gli helper di `tests/fakes.ts`; per
  pagine, layout e componenti aggiungi test Vitest in `frontend/tests/nuxt/`
  con `mountSuspended` e gli helper di `tests/nuxt/helpers.ts`. Le soglie di
  copertura sono in `bunfig.toml` e `vitest.config.ts`: non abbassarle per far
  passare i test (vedi `docs/frontend.md#test`).
- Contenuti Nuxt Content: mantieni le versioni `en` e `it` allineate e rispetta
  gli schemi in `content.config.ts` / `content/types.ts`.
- Navigazione: sidebar in `app/layouts/dashboard.vue`, header pubblico in
  `app/components/layout/Header.vue`.

## Stile generale

- Segui lo stile del codice circostante: densità dei commenti bassa, commenti e
  identificatori in inglese, nessun commento che ripete il codice.
- Modifiche minime e mirate; niente refactoring o rinomine non richiesti.
- Se cambi comportamento, comandi o configurazione, aggiorna la guida in `docs/`
  corrispondente (scritta in italiano) e, se serve, il `README.md`.

## Definizione di "fatto"

1. `make format`
2. `make check`
3. `make test` (oppure, senza Docker, `cd backend && uv run --locked pytest` e
   `cd frontend && bun run test`)
4. Artefatti API rigenerati, migrazione presente, traduzioni in entrambe le lingue,
   documentazione aggiornata.

Nel resoconto finale indica quali controlli hai eseguito, il loro esito reale e
quali non hai potuto eseguire (es. Docker assente). Non dichiarare superato un
controllo che non hai eseguito.
