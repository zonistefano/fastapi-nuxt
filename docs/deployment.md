# Deployment

L'artefatto di deployment supportato è una coppia di **immagini container di
produzione** (backend e frontend). Pubblicazione e hosting sono operazioni
separate e manuali: nessun push sul template o su un progetto derivato avvia un
deployment.

## Immagini

| Immagine | Contenuto | Utente |
| --- | --- | --- |
| `backend` | Target `production` di `backend/backend.Dockerfile`: app, Alembic, script di avvio, dipendenze runtime. Usata anche da `prestart`, `celeryworker`, `celerybeat`. | `app` (non root) |
| `frontend` | Output Nitro (`.output/`) eseguito con Bun sulla porta 3000. | `node` (non root) |

Build locale:

```sh
make build   # = docker compose -f docker-compose.yml build backend frontend
```

`NUXT_UMAMI_ID` e `NUXT_UMAMI_HOST` sono build arg del frontend: se vuoi gli
analytics, impostali **prima** del build. Tutte le altre impostazioni sono lette a
runtime.

## Pubblicare su GHCR

Il workflow **Publish container images** (`.github/workflows/cd.yml`):

1. dalla scheda Actions, avvialo da `main` indicando un tag (es. `1.0.0`);
2. il workflow esegue `make setup check test` sul commit selezionato;
3. valida il tag e calcola `IMAGE_PREFIX=ghcr.io/<owner>/<repo>` (minuscolo);
4. si autentica a GHCR con `GITHUB_TOKEN`, costruisce e pubblica:
   - `ghcr.io/<owner>/<repo>/backend:<tag>`
   - `ghcr.io/<owner>/<repo>/frontend:<tag>`

Requisiti: GitHub Actions deve avere il permesso di pubblicare pacchetti
nell'organizzazione. La visibilità dei pacchetti si imposta su GHCR. Non sono
configurati Docker Hub, PyPI né deployment automatici.

## Eseguire in produzione con Compose

Sulla macchina di destinazione servono `docker-compose.yml`, `.env.example` e
`scripts/init.py` (o un `.env` equivalente fornito dal tuo secret manager).

```sh
python3 scripts/init.py   # crea .env con segreti nuovi, solo la prima volta
```

Imposta poi in `.env` almeno:

```env
IMAGE_PREFIX=ghcr.io/<owner>/<repo>
TAG=1.0.0
PROJECT_NAME=...
FRONTEND_HOST=app.example.com
FRONTEND_URL=https://app.example.com
BACKEND_CORS_ORIGINS=["https://app.example.com"]
NUXT_PUBLIC_APP_NAME=...
NUXT_PUBLIC_API_URL=https://api.example.com
NUXT_PUBLIC_API_WS=wss://api.example.com
ENABLE_DOCS=false
FIRST_SUPERUSER=admin@example.com
SMTP_HOST=...            # e le altre variabili SMTP
EMAILS_FROM_EMAIL=...
```

Avvio:

```sh
docker compose --env-file .env -f docker-compose.yml pull
docker compose --env-file .env -f docker-compose.yml up -d --no-build
```

Il `-f docker-compose.yml` esplicito esclude `docker-compose.override.yml` (porte e
impostazioni di sviluppo). Equivalenti Make, se hai la repo completa:
`make prod_up` (costruisce localmente) e `make prod_down`.

Per i job in background aggiungi `--profile workers`. Il profilo `tools`
(pgAdmin, Flower) va usato solo in ambienti con un confine di accesso adeguato.

### Rete e TLS

Il file di produzione non pubblica porte sull'host: database, backend e frontend
sono raggiungibili solo sulla rete Compose. Collega a questa rete un reverse proxy
con TLS (Traefik, Caddy, Nginx…) e instrada:

- dominio frontend → `frontend:3000`
- dominio API → `backend:8000`

Dietro un proxy imposta nel `.env` la variabile `FORWARDED_ALLOW_IPS` con gli
indirizzi del proxy (letta da Uvicorn; default `127.0.0.1`), così gli header
`X-Forwarded-*` vengono accettati solo da lì e rate limit e log vedono l'IP reale
del client. Non usare `*` se il backend è raggiungibile senza passare dal proxy.

### Health check

- `backend`: `GET /health-check/` ogni 10 s (liveness; non verifica il DB).
- `db`: `pg_isready`.
- `backend` parte solo dopo che `prestart` ha completato migrazioni e bootstrap.

## Segreti e chiavi persistenti

- `SECRET_KEY` e `TOTP_SECRET_KEY` devono essere **identiche su tutte le repliche**
  e stabili tra i deployment. Cambiarle invalida le sessioni o rende illeggibili i
  segreti TOTP.
- Non usare mai i segreti di sviluppo in produzione: generane di nuovi.
- Non mettere token di registry in file committati.

## Scalare

- L'immagine backend avvia un solo worker Uvicorn. Prima di aumentare i worker o
  le repliche imposta `RATE_LIMIT_REDIS_URL` su un Redis condiviso (es.
  `redis://queue:6379/2` con il profilo `workers`), oppure applica i limiti nel
  gateway.
- Le migrazioni vengono applicate da `prestart`: con più repliche esegui
  `prestart` una sola volta per rilascio.
- Celery: aumenta le repliche di `celeryworker`; esegui **un solo** `celerybeat`.

## Aggiornare una versione

1. Pubblica le nuove immagini con un nuovo tag.
2. Fai un backup del database.
3. Aggiorna `TAG` in `.env`, poi `pull` e `up -d --no-build`: `prestart` applica le
   nuove migrazioni prima che il backend riparta.

Per un rollback ripristina il tag precedente; se la nuova versione conteneva
migrazioni, valuta `alembic downgrade` o il ripristino del backup.

## Database

PostgreSQL 17 con dati nel volume `app-db-data`. `make dev_clean` e
`docker compose down --volumes` **eliminano** i volumi. Pianifica backup regolari
(es. `pg_dump` da un container sulla stessa rete). Per un cambio di major version
segui la procedura di upgrade di PostgreSQL.

## Checklist di produzione

- [ ] Segreti generati per l'ambiente, conservati in modo sicuro.
- [ ] `ENABLE_DOCS=false` se l'API non deve essere documentata pubblicamente.
- [ ] `BACKEND_CORS_ORIGINS` limitato ai domini reali.
- [ ] `FRONTEND_URL`, `NUXT_PUBLIC_API_URL` e `site.url` di Nuxt con i domini pubblici.
- [ ] SMTP configurato e testato (magic link, recupero password, conferma email).
- [ ] TLS sul reverse proxy; proxy fidati configurati.
- [ ] Redis condiviso per il rate limit se ci sono più processi.
- [ ] `workers` attivo o pulizia auth pianificata (`python -m app.maintenance`).
- [ ] Backup del database pianificati e verificati.
- [ ] Password del superuser iniziale cambiata dopo il primo accesso.
