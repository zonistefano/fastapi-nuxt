# Backend

Applicazione FastAPI nel pacchetto Python `app`, in `backend/`. Python 3.13,
dipendenze bloccate in `backend/uv.lock` e gestite con uv.

## Avvio dell'applicazione

`app/main.py` espone `create_app()` e l'istanza `app`:

- titolo da `PROJECT_NAME`; docs e schema OpenAPI disattivabili con `ENABLE_DOCS`;
- `RateLimitMiddleware` (sempre) e `CORSMiddleware` (se `BACKEND_CORS_ORIGINS` non è
  vuota, con header `Retry-After` esposto);
- `operationId` di ogni rotta nel formato `{primo_tag}_{nome_funzione}`, da cui
  derivano i nomi dell'SDK frontend;
- `GET /health-check/` — liveness probe esente dal rate limit; non verifica il
  database (lo fa `prestart`);
- `lifespan` che chiude la connessione Redis del rate limiter allo spegnimento.

Il logging viene configurato all'import (`logging_conf.configure_logging`).

### Sequenza di avvio nei container

`prestart.sh`, eseguito dal servizio `prestart` prima del backend:

1. `app/backend_pre_start.py` — riprova `SELECT 1` per un massimo di 5 minuti;
2. `alembic upgrade head`;
3. `app/initial_data.py` — crea `FIRST_SUPERUSER` se non esiste.

L'immagine di produzione avvia `fastapi run --workers 1`: con un solo processo i
contatori del rate limit in memoria sono coerenti. Prima di aumentare i worker
configura `RATE_LIMIT_REDIS_URL`.

## Moduli

Il codice di dominio sta in `app/src/<modulo>/`. Struttura e collegamento sono
descritti in [Architettura](architecture.md#backend-anatomia-di-un-modulo).

| Modulo | Contenuto |
| --- | --- |
| `auth` | Integrazione `fastapi-myauth`: modello utente, router `/login/*`, `/users/*`, `/services/contact`. Vedi [Autenticazione](authentication.md). |
| `chat` | Scheletro: router vuoto, `ChatSettings` vuoto. Destinato a una chat AI con il backend come proxy verso un LLM. |
| `editor` | Scheletro. Destinato a un editor di testo collaborativo con salvataggio su PostgreSQL. |
| `bpmn` | Scheletro. Destinato alla persistenza/esecuzione dei diagrammi dell'editor BPMN. |

Per creare un nuovo modulo copia uno degli scheletri, rinominalo e registralo in
`app/router.py` e `app/models.py`.

## Modelli

I modelli usano SQLModel: una stessa gerarchia di classi definisce la tabella
(`table=True`) e gli schemi di input/output dell'API. Convenzione consigliata:

```python
class ThingBase(SQLModel):          # campi condivisi
class Thing(ThingBase, table=True): # tabella: id, chiavi esterne, timestamp
class ThingCreate(ThingBase):       # body di creazione
class ThingUpdate(SQLModel):        # tutti i campi opzionali
class ThingRead(ThingBase):         # risposta: cosa esporre
```

- Esponi sempre un modello `*Read` come tipo di ritorno: evita di restituire campi
  interni e produce tipi OpenAPI precisi per il frontend.
- La tabella utenti si chiama `user`: per una chiave esterna usa
  `Field(foreign_key="user.id")`.
- Usa timestamp con fuso orario (`datetime.now(UTC)`).
- Ricorda di importare i modelli nel `models/__init__.py` del modulo, altrimenti
  Alembic non li vede.

## CRUD

`app/crud.py` definisce `CRUDBase[Model, CreateSchema, UpdateSchema]`:

| Metodo | Comportamento |
| --- | --- |
| `get(db, id)` | `db.get` per chiave primaria. |
| `get_multi(db, page=0, page_break=False)` | Ordinato per chiave primaria, pagine da `MULTI_MAX`; `page_break=True` restituisce tutto; pagina negativa = `ValueError`. |
| `create(db, obj_in=...)` | Valida e inserisce. |
| `update(db, db_obj=..., obj_in=...)` | Accetta un modello (solo campi impostati) o un `dict`. |
| `remove(db, id=...)` | Restituisce l'oggetto eliminato o `None` se non esiste. |

Uso minimo:

```python
from app.crud import CRUDBase
from ..models import Item, ItemCreate, ItemUpdate

crud_item = CRUDBase[Item, ItemCreate, ItemUpdate](Item)
```

Per query specifiche crea una sottoclasse con metodi aggiuntivi (esempio completo
nel [tutorial](tutorial-feature.md#2-crud)).

## Transazioni e dipendenze

Le rotte devono usare la sessione condivisa con l'autenticazione:

```python
from typing import Annotated
from fastapi import Depends

from app.deps import SessionDep
from app.src.auth.api.deps import CurrentUser, RequireRole
from app.src.auth.models import CustomUser

User = Annotated[CustomUser, Depends(CurrentUser)]
Admin = Annotated[CustomUser, Depends(RequireRole(["admin"]))]
```

- `SessionDep` apre una sessione dentro `fastapi_myauth.transactions.transaction`:
  **commit alla fine della richiesta, rollback completo in caso di eccezione**.
  Un `IntegrityError` diventa `409`.
- I metodi di `CRUDBase` chiamano `persist()`: dentro una transazione gestita
  eseguono solo `flush` (+ `refresh`), fuori da essa committano. Così più
  operazioni nella stessa richiesta sono atomiche.
- In codice fuori dalle richieste (script, task Celery) che compone più
  operazioni, avvolgile in `with transaction(session):`.

## Migrazioni

Alembic è configurato in `backend/alembic/` con `target_metadata = SQLModel.metadata`
e `compare_type=True`. I file di revisione hanno il prefisso della data
(`2026-10-14_auth_1_6_sessions.py`).

```sh
# genera una revisione dal diff modelli ↔ database di sviluppo
make backend_makemigrations MESSAGE="add documents table"

# applica le migrazioni al database di sviluppo
make dev_db_up
```

`backend_makemigrations` avvia il DB, porta lo schema a `head` e lancia
`alembic revision --autogenerate` nel container; la directory `alembic/versions`
è montata, quindi il file compare nella repo. **Rileggi sempre la revisione
generata** (autogenerate non rileva rinomine, vincoli complessi, dati) prima di
committarla.

`tests/test_migrations.py` applica tutte le migrazioni a un database vuoto e
confronta lo schema risultante con i modelli: se aggiungi un modello senza
migrazione, il test fallisce.

Non eliminare le revisioni esistenti: creano le tabelle di autenticazione. Su
installazioni esistenti fai un backup prima di `alembic upgrade head` e mantieni
invariate `SECRET_KEY` e `TOTP_SECRET_KEY`.

> Nota sulla revisione `auth_1_6_sessions`: sostituisce i refresh token in chiaro
> con hash, aggiunge versione di sessione, challenge e recovery code e converte i
> timestamp PostgreSQL legacy da UTC a `timestamptz`. I token esistenti vengono
> invalidati: gli utenti devono rifare il login.

## Job in background

Attivi con `make dev_workers` (profilo `workers`).

- `app/core/celery_app.py`: app Celery, broker/result da `CELERY_*`, tutti i task
  `app.worker.*` instradati su `main-queue`.
- `app/worker/worker.py`: `example_task` e `prune_auth_records`.
- Lo scheduler `celerybeat` usa RedBeat (schedule salvata in Redis) ed esegue
  `prune_auth_records` ogni ora: rimuove refresh token, challenge email e
  cerimonie passkey scaduti.
- `worker-start.sh` verifica il DB (`celeryworker_pre_start.py`) e avvia il worker
  con concorrenza 1.

Nuovo task:

```python
# app/worker/worker.py
@celery_app.task
def send_report(user_id: str) -> None: ...
```

Esportalo in `app/worker/__init__.py`, accodalo con `send_report.delay(str(user.id))`
e, se periodico, aggiungilo a `celery_app.conf.beat_schedule`.

Senza worker, la pulizia auth si può pianificare esternamente (cron):

```sh
uv run --project backend --locked --env-file .env python -m app.maintenance
```

## Logging

Configurazione `dictConfig` in `app/logging_conf.py`, un handler su stdout. Livello,
formato e filtri si controllano con `LOG_LEVEL`, `LOG_FORMAT` e `LOG_FILTERS` (vedi
[Configurazione](configuration.md#logging)). Usa `logging.getLogger(__name__)` nei
moduli; nei task Celery `celery.utils.log.get_task_logger`.

## Test

```sh
make test_backend                       # PostgreSQL 17 usa e getta, con coverage
cd backend && uv run --locked pytest    # loop veloce, SQLite in memoria
```

- `scripts/test.sh` (root) crea un progetto Compose con nome univoco, un `.env`
  temporaneo con segreti generati e un database su `tmpfs`; non legge il tuo
  `.env`, non pubblica porte e non tocca i volumi di sviluppo. Alla fine rimuove
  tutto, anche in caso di errore.
- Nel container `backend/scripts/tests-start.sh` attende il DB, applica le
  migrazioni, crea il superuser ed esegue `coverage run -m pytest`. Il report HTML
  finisce in `backend/htmlcov/`.
- Eseguito direttamente, `pytest` usa SQLite in memoria e variabili fittizie
  impostate in `tests/conftest.py`.

Fixture principali (`tests/conftest.py`):

| Fixture | Descrizione |
| --- | --- |
| `db` | Sessione in una transazione esterna annullata a fine test; superuser già creato. |
| `client` | `TestClient` con la sessione `db`, email disabilitate, registrazione aperta, rate limit in memoria isolato. |

Struttura: `tests/api/v1/` per gli endpoint, `tests/crud/` per CRUD, `tests/scripts/`
per gli script di avvio, test di configurazione e migrazioni nella radice.

## Comandi utili

```sh
make backend_setup     # uv sync --locked
make lint_backend      # ruff check (backend, scripts, tests)
make format_backend    # ruff --fix + ruff format
make build_backend     # immagine di produzione
make backend_upgrade   # aggiorna le dipendenze e uv.lock
make docker_exec_backend CMD="alembic history"
uv build backend --out-dir dist   # wheel/sdist (nessuna pubblicazione su PyPI)
```

## Dockerfile

`backend/backend.Dockerfile` ha tre stage su `python:3.13.2-slim` con uv:

- `dependencies` — installa solo le dipendenze runtime dal lockfile (cache layer);
- `development` — aggiunge le dipendenze dev e il codice, avvia con `--reload`;
- `production` — copia `app`, `alembic` e gli script, installa senza dipendenze
  dev, gira come utente non root `app`.
