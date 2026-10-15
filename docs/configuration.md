# Configurazione

Tutta la configurazione arriva da variabili d'ambiente. In sviluppo e nel
deployment Compose provengono dal file `.env` nella root, creato da `make init`
(vedi [Creare un nuovo progetto](getting-started.md#3-inizializzare-la-configurazione)).

- `.env.example` è committato: contiene i **nomi** delle variabili, i default non
  sensibili e i segreti vuoti. Quando aggiungi una variabile, aggiungila qui;
  `make init` la propagherà nei `.env` esistenti senza toccare gli altri valori.
- `.env` non va mai committato. Se un segreto è finito nella storia Git, revocalo
  presso il provider: cancellarlo dal commit non basta.
- Le variabili marcate **segreto** vengono generate da `make init` se vuote.

## Dove viene letta ogni variabile

| Consumatore | Classe / file |
| --- | --- |
| Backend, impostazioni generali | `Settings` in `backend/app/core/config.py` |
| Backend, autenticazione ed email | `AuthSettings` in `backend/app/src/auth/config.py` (estende `fastapi_myauth.config.Settings`) |
| Backend, moduli di dominio | `ChatSettings`, ecc. in `backend/app/src/<modulo>/config.py` |
| Logging | `backend/app/logging_conf.py` (variabili lette direttamente) |
| Frontend a runtime | `runtimeConfig` in `frontend/nuxt.config.ts` (`NUXT_PUBLIC_*`) |
| Frontend al build | `nuxt.config.ts` (`NUXT_UMAMI_*`, passate come build arg) |
| Docker Compose | `docker-compose*.yml` (`IMAGE_PREFIX`, `TAG`, credenziali di servizio) |

## Generali e applicazione

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `PROJECT_NAME` | — (obbligatoria) | Titolo dell'API e nome nelle email. |
| `ENABLE_DOCS` | `true` | Espone `/docs`, `/redoc` e `/openapi.json`. Con `false` tutte e tre rispondono 404. |
| `BACKEND_CORS_ORIGINS` | `[]` | Origini autorizzate, come lista JSON (`["https://app.example.com"]`) o separate da virgole. Lo slash finale viene rimosso; `*` è rifiutato perché CORS usa le credenziali. |
| `FRONTEND_HOST` | `localhost` | Host del frontend usato dalla libreria auth. |
| `FRONTEND_URL` | `http://localhost:3000` | Base dei link inviati via email (magic link, reset, conferma). |
| `MULTI_MAX` | `20` | Dimensione pagina di `CRUDBase.get_multi` e degli elenchi auth. |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | Letta da Uvicorn: indirizzi dei proxy da cui accettare gli header `X-Forwarded-*`. Impostala con l'IP del reverse proxy in produzione. |

## Database

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `POSTGRES_SERVER` | — | Host di PostgreSQL (`db` in Compose, `localhost` dall'host). |
| `POSTGRES_PORT` | `5432` | Porta (1–65535). |
| `POSTGRES_DB` | — | Nome del database. |
| `POSTGRES_USER` | — | Utente. |
| `POSTGRES_PASSWORD` | **segreto** | Password. Caratteri speciali supportati (l'URL è costruito con SQLAlchemy). |
| `SQLALCHEMY_DATABASE_URI` | calcolata | Se impostata sostituisce l'URL costruito dai campi `POSTGRES_*`. |

## Autenticazione

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `SECRET_KEY` | **segreto**, min. 32 caratteri | Firma dei JWT. Deve essere identica su tutte le repliche e stabile nel tempo. |
| `TOTP_SECRET_KEY` | **segreto**, chiave Fernet | Cifra i segreti TOTP nel database. Cambiarla richiede una migrazione dei segreti. |
| `FIRST_SUPERUSER` | `admin@example.com` | Email dell'amministratore creato da `prestart` se non esiste. |
| `FIRST_SUPERUSER_PASSWORD` | **segreto**, 8–64 caratteri | Password iniziale dell'amministratore. |
| `USERS_OPEN_REGISTRATION` | `true` | Con `false`, `/login/signup` è disabilitato. |
| `REQUIRE_EMAIL_VALIDATION` | `false` in `.env.example` (`true` nella libreria) | Richiede la conferma email per l'accesso. |
| `ACCESS_TOKEN_EXPIRE_SECONDS` | `1800` | Durata dell'access token. |
| `REFRESH_TOKEN_EXPIRE_SECONDS` | `2592000` (30 giorni) | Durata del refresh token. |
| `SESSION_MAX_LIFETIME_SECONDS` | `2592000` | Durata massima assoluta di una sessione, anche con rinnovi. |
| `RECENT_AUTH_EXPIRE_SECONDS` | `300` | Finestra di "autenticazione recente" per operazioni sensibili. |
| `MAX_REFRESH_SESSIONS_PER_USER` | `10` | Sessioni refresh attive per utente. |
| `JWT_ALGO` | `HS512` | Algoritmo JWT. |
| `EMAIL_RESET_TOKEN_EXPIRE_HOURS` | `48` | Validità del link di reset password. |
| `EMAIL_VALIDATION_TOKEN_EXPIRE_HOURS` | `48` | Validità del link di conferma email. |
| `SERVER_BOT` | `Assistant` | Nome mittente "bot" usato dalla libreria. |

Le variabili senza riga in `.env.example` assumono il default della libreria;
aggiungile a `.env` per modificarle.

## Rate limiting

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `RATE_LIMIT_ENABLED` | `true` | Abilita il middleware di rate limiting. |
| `RATE_LIMIT_REDIS_URL` | vuota | Senza valore i contatori sono in memoria (validi solo con un processo). Con più worker o repliche imposta un Redis condiviso, es. `redis://queue:6379/2`. |

## Email (SMTP)

L'invio è attivo solo se `SMTP_HOST`, `SMTP_PORT` ed `EMAILS_FROM_EMAIL` sono
tutti valorizzati.

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `SMTP_HOST` | vuota | Server SMTP. Vuota = email disabilitate. |
| `SMTP_PORT` | `1025` | Porta SMTP. |
| `SMTP_USER`, `SMTP_PASSWORD` | vuote | Credenziali SMTP. |
| `SMTP_TLS` | `false` | STARTTLS. |
| `SMTP_SSL` | `false` | TLS implicito (es. porta 465). |
| `EMAILS_FROM_EMAIL` | `noreply@example.com` | Mittente. |
| `EMAILS_FROM_NAME` | `FastAPI Nuxt` | Nome mittente. |
| `EMAILS_TO_EMAIL` | `admin@example.com` | Destinatario dei messaggi del form contatti. |
| `EMAIL_TEMPLATES_DIR` | template della libreria | Directory alternativa per i template HTML. |
| `EMAILS_ENABLED` | calcolata | Forza l'abilitazione; con `true` ma SMTP incompleto l'avvio fallisce. |

## Celery e Redis

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `CELERY_BROKER_URL` | `redis://queue:6379/0` | Broker. |
| `CELERY_RESULT_BACKEND` | `redis://queue:6379/1` | Backend dei risultati. |

## Logging

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warning`, `error`, `critical`. |
| `LOG_FORMAT` | `simple` | `simple` (livello + messaggio) o `verbose` (timestamp, PID, modulo). |
| `LOG_FILTERS` | vuota | Sottostringhe separate da virgola: i messaggi che le contengono vengono scartati. `/health-check` è sempre filtrato. |

## Frontend

| Variabile | Quando | Descrizione |
| --- | --- | --- |
| `NUXT_PUBLIC_APP_NAME` | runtime | Nome dell'app mostrato nella UI. |
| `NUXT_PUBLIC_API_URL` | runtime | URL pubblico del backend, raggiungibile **dal browser**. |
| `NUXT_PUBLIC_API_WS` | runtime | URL WebSocket del backend (predisposto per funzioni realtime). |
| `NUXT_OG_IMAGE_SECRET` | runtime, **segreto** | Firma delle URL di `nuxt-og-image`. |
| `NUXT_UMAMI_ID`, `NUXT_UMAMI_HOST` | **build** | Analytics Umami, attive solo se entrambe sono valorizzate. Cambiarle richiede di ricostruire l'immagine. |

Le variabili `NUXT_PUBLIC_*` sovrascrivono `runtimeConfig.public` a runtime, quindi
la stessa immagine frontend può servire ambienti diversi.

## Strumenti

| Variabile | Descrizione |
| --- | --- |
| `PGADMIN_DEFAULT_EMAIL` | Login di pgAdmin. |
| `PGADMIN_DEFAULT_PASSWORD` | **segreto** — password di pgAdmin. |
| `FLOWER_USER` | Utente basic auth di Flower. |
| `FLOWER_PASSWORD` | **segreto** — password di Flower. |

## Immagini

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `IMAGE_PREFIX` | `local` | Prefisso del registry, es. `ghcr.io/org/repo`. |
| `TAG` | `dev` | Tag delle immagini. |

## Aggiungere una variabile

1. Aggiungi il campo alla classe `BaseSettings` del modulo interessato (in
   `core/config.py` se è generale), con tipo e validazione Pydantic.
2. Aggiungi la riga a `.env.example`. Se è un segreto da generare, aggiungi il nome
   a `SECRET_NAMES` in `scripts/init.py`.
3. Se serve nei test o nell'export OpenAPI, aggiungi un valore fittizio in
   `backend/tests/conftest.py` e/o `backend/scripts/export_openapi.py`.
4. Per il frontend, aggiungi la chiave in `runtimeConfig` di `nuxt.config.ts`
   (`public` solo se può essere esposta al browser) e passala al servizio
   `frontend` in `docker-compose.yml`.
