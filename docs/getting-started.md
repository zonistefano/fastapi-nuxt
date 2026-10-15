# Creare un nuovo progetto dal template

Questa guida porta da "Use this template" a un progetto personalizzato, avviato e
verificato. Per i dettagli su ogni area segui i link alle altre guide.

## 1. Creare la repository

Usa il pulsante **Use this template** su GitHub oppure copia i sorgenti in una nuova
repository. Non serve mantenere la storia Git del template.

## 2. Requisiti

### Sviluppo in container (consigliato)

- Python 3 (solo per `scripts/init.py`), GNU Make, Bash
- Docker e Docker Compose **2.32 o superiore** (serve Compose Watch)

Backend e frontend girano nelle immagini; non servono `node_modules` né un
virtualenv sull'host.

### Strumenti locali (IDE, check, test frontend)

Per avere completamento nell'IDE ed eseguire `make check`/`make test` installa le
versioni fissate nei file della root:

| File | Strumento | Versione |
| --- | --- | --- |
| `.python-version` | Python | 3.13.2 |
| `.uv-version` | uv | 0.13.1 |
| `.node-version` | Node | 22.14.0 |
| `.bun-version` | Bun | 1.4.3 |

uv può scaricare da solo l'interprete Python fissato. Poi:

```sh
make setup   # make init + uv sync --locked + bun install --frozen-lockfile
```

### Dev Container

`.devcontainer/devcontainer.json` fornisce un ambiente con Python 3.13, Node
22.14, Docker-in-Docker e le estensioni VS Code (Ruff, Volar, ESLint, Prettier,
Tailwind…). Alla creazione `.devcontainer/setup.sh` installa uv e Bun nelle
versioni fissate ed esegue `make setup`.

## 3. Inizializzare la configurazione

```sh
make init
```

`scripts/init.py` crea `.env` a partire da `.env.example` (permessi `0600`) e genera
segreti casuali e **specifici del progetto** per:

`FIRST_SUPERUSER_PASSWORD`, `SECRET_KEY`, `TOTP_SECRET_KEY` (chiave Fernet),
`POSTGRES_PASSWORD`, `PGADMIN_DEFAULT_PASSWORD`, `FLOWER_PASSWORD`,
`NUXT_OG_IMAGE_SECRET`.

Il comando è idempotente: completa solo le variabili mancanti o i segreti vuoti e
non tocca mai i valori esistenti. Tutti i target `make` che avviano container lo
eseguono automaticamente. `.env` è ignorato da Git: non committarlo mai.

> `SECRET_KEY` e `TOTP_SECRET_KEY` devono restare stabili per tutta la vita del
> progetto. Cambiare la prima invalida tutte le sessioni; cambiare la seconda rende
> illeggibili i segreti TOTP salvati.

Tutte le variabili sono descritte in [Configurazione](configuration.md).

## 4. Avviare

```sh
make dev
```

Compose costruisce le immagini di sviluppo e avvia:

1. `db` — PostgreSQL 17, con healthcheck;
2. `prestart` — attende il DB, applica `alembic upgrade head`, crea il superuser;
3. `backend` — FastAPI con `--reload` su http://localhost:8000;
4. `frontend` — `nuxt dev` su http://localhost:3000 (HMR sulla porta 24678).

Compose Watch sincronizza `backend/app` e `frontend/` nei container; una modifica a
`pyproject.toml`, `uv.lock`, `package.json` o `bun.lock` ricostruisce l'immagine.

Accedi al frontend con le credenziali del superuser presenti in `.env`.

Varianti utili:

```sh
make dev_backend         # solo db + prestart + backend
make dev_frontend        # solo frontend containerizzato
make dev_frontend_local  # Nuxt sull'host (Bun), legge ../.env
make dev_db_up           # solo db + migrazioni + superuser
make dev_workers         # + Redis, worker Celery, scheduler
make dev_tools           # + Redis, pgAdmin (5050), Flower (5555), mailcatcher (1080)
make dev_logs            # segue i log di tutti i servizi
make dev_down            # ferma tutto, conserva i dati
make dev_clean           # ferma tutto ed ELIMINA i volumi del database
```

Per eseguire il backend sull'host (es. con il debugger di VS Code, configurazione
già presente in `.vscode/launch.json`) avvia prima il database con
`make dev_db_up`, poi:

```sh
POSTGRES_SERVER=localhost uv run --project backend --locked --env-file .env \
  fastapi dev backend/app/main.py
```

### Email in locale

Con `SMTP_HOST` vuoto le email sono disabilitate: funziona il login con password,
mentre magic link, conferma email, recupero password e form contatti rispondono
`503`. Per provarli in locale usa mailcatcher:

```env
SMTP_HOST=mailcatcher
SMTP_PORT=1025
SMTP_TLS=false
SMTP_SSL=false
```

poi `make dev_tools` e apri http://localhost:1080.

## 5. Verificare

```sh
make check   # tooling, lint, formattazione, tipi Vue, client API aggiornato
make test    # backend su PostgreSQL usa e getta + test Bun del frontend
make build   # immagini di produzione
```

Dettagli in [Qualità, test e CI](quality.md).

## 6. Checklist di personalizzazione

Esegui questi passi nel nuovo progetto prima del primo rilascio.

### Identità del progetto

- [ ] `.env.example` e `.env`: `PROJECT_NAME`, `EMAILS_FROM_NAME`,
      `EMAILS_FROM_EMAIL`, `EMAILS_TO_EMAIL`, `FIRST_SUPERUSER`,
      `NUXT_PUBLIC_APP_NAME`.
- [ ] `docker-compose.yml` e `docker-compose.override.yml`: default di
      `NUXT_PUBLIC_APP_NAME`.
- [ ] `frontend/nuxt.config.ts`: `runtimeConfig.public.appName`, `site.url`,
      blocco `llms` (`domain`, `title`, `description`), rotte in
      `nitro.prerender.routes`, lingue in `i18n.locales`.
- [ ] `frontend/app/app.config.ts`: colore primario di Nuxt UI (default `red`).
- [ ] `frontend/public/`: favicon, icone Android/Apple, `site.webmanifest`
      (`name`, `short_name`, colori), `browserconfig.xml`, `safari-pinned-tab.svg`.
- [ ] `backend/pyproject.toml`: `description` (il nome del pacchetto `app` è
      l'import root: lascialo invariato).
- [ ] `backend/scripts/export_openapi.py`: titolo dello schema esportato.
- [ ] `.devcontainer/devcontainer.json`: `name`.

### Contenuti

- [ ] `frontend/content/{en,it}/index.yml` — landing page.
- [ ] `frontend/content/{en,it}/pricing.yml` — piani e FAQ.
- [ ] `frontend/content/{en,it}/blog/`, `changelog/`, `docs/` — contenuti demo da
      sostituire o eliminare.
- [ ] `frontend/content/{en,it}/privacy.md` — informativa privacy reale.
- [ ] `frontend/i18n/locales/{en,it}.ts` — testi dell'interfaccia.

### Governance della repository

- [ ] `LICENSE`: titolare del copyright e anno.
- [ ] `CHANGELOG.md`: azzera la storia del template.
- [ ] `.github/CODEOWNERS`: owner reali (es. `* @org/maintainers`).
- [ ] `.github/SECURITY.md`: abilita il private vulnerability reporting e indica
      un contatto di sicurezza.
- [ ] `.github/FUNDING.yml`, `.github/settings.yml`, `.github/CONTRIBUTING.md`,
      `.github/CODE_OF_CONDUCT.md`, `.github/SUPPORT.md`, template di issue/PR.
- [ ] Permessi GitHub Actions per pubblicare pacchetti su GHCR (vedi
      [Deployment](deployment.md)).

### Funzionalità da tenere o rimuovere

- [ ] **Moduli backend vuoti** (`backend/app/src/{chat,editor,bpmn}`): usali come
      base per il tuo dominio o rimuovili insieme alle righe corrispondenti in
      `backend/app/router.py` e `backend/app/models.py`.
- [ ] **Editor BPMN demo**: `frontend/app/pages/bpmn-editor.vue`,
      `frontend/app/components/bpmn/`, `frontend/app/layouts/bpmn.vue`, voce
      `nav.bpmn` in `components/layout/Header.vue`, chiavi `bpmn` nei file i18n e
      dipendenze `@vue-flow/*` in `package.json`.
- [ ] **Componenti demo**: `AnimatedBeam*.vue`, `SafariMockup.vue`, `StarsBg.vue`,
      `ImagePlaceholder.vue` se la landing cambia.
- [ ] **Blog, changelog, docs, pricing**: pagine in `frontend/app/pages/` e
      collezioni in `frontend/content.config.ts`.
- [ ] **Campo utente di esempio** `language`: adatta `CustomUser` in
      `backend/app/src/auth/models.py` (vedi [Autenticazione](authentication.md#estendere-il-modello-utente)).
- [ ] **Lingue**: aggiungi o togli locali in `nuxt.config.ts`, `content.config.ts`,
      `frontend/i18n/locales/` e `frontend/content/<locale>/`.

Dopo modifiche a rotte o modelli backend esegui sempre `make api_generate` e
committa gli artefatti generati (vedi [Client API](api-client.md)).

### Migrazioni

Le migrazioni in `backend/alembic/versions/` creano le tabelle di autenticazione e
sono necessarie. In un progetto nuovo, senza database da preservare, puoi
modificare il campo di esempio e generare una nuova revisione sopra quelle
esistenti; non cancellarle (vedi [Backend → Migrazioni](backend.md#migrazioni)).

## Prossimi passi

- Capire l'organizzazione del codice: [Architettura](architecture.md).
- Aggiungere la prima funzionalità: [Tutorial](tutorial-feature.md).
- Mettere in produzione: [Deployment](deployment.md).
