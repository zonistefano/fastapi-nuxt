# Autenticazione

L'autenticazione è delegata alla libreria [`fastapi-myauth`](https://github.com/zonistefano/fastapi_auth),
fissata alla versione **1.6.0**. Il template non reimplementa i meccanismi di
sicurezza: li configura, estende il modello utente e fornisce il client Nuxt.

## Componenti backend

| File | Ruolo |
| --- | --- |
| `app/src/auth/config.py` | `AuthSettings`: estende le impostazioni della libreria e le carica dall'ambiente. Rende obbligatori `SECRET_KEY`, `TOTP_SECRET_KEY`, `FIRST_SUPERUSER*`. |
| `app/src/auth/models.py` | `CustomUser` e relativi schemi `Create/Read/Update`; `auth_components` li registra nella libreria. |
| `app/src/auth/service.py` | Istanza `auth = FastAuth(...)` con engine, componenti e configurazione del rate limit (Redis opzionale). |
| `app/src/auth/api/api.py` | Monta `/users/*`, il router della libreria (`/login/*`) e `/services/*`. |
| `app/src/auth/api/deps.py` | `CurrentUser` e `RequireRole` da usare nelle rotte applicative. |
| `app/src/auth/api/endpoints/` | Estensioni del template: `POST /users/send-validation-email`, `POST /services/contact`. |
| `app/src/auth/crud.py` | `crud_user` della libreria. |

## Flussi supportati

### Password (OAuth2)

`POST /login/oauth` con form `username` + `password` → `{access_token, refresh_token, token_type}`.
Se l'utente ha il TOTP attivo, l'access token restituito è un token "TOTP" valido
solo per il passo successivo.

### TOTP (2FA)

1. `POST /login/new-totp` — genera segreto e URI per il QR code (utente loggato).
2. `PUT /login/totp` — verifica un codice e attiva il TOTP; restituisce nuovi
   token e i **codici di recupero**, mostrati una sola volta.
3. Al login: `POST /login/totp` con il codice nel body e il token TOTP
   nell'header `Authorization`.
4. `POST /login/totp/recover` — accesso con un codice di recupero.
5. `POST /login/totp/recovery-codes` — rigenera i codici.
6. `DELETE /login/totp` — disattiva.

Attivare o disattivare il TOTP sostituisce le sessioni esistenti: il client
salva i token restituiti.

### Magic link

1. `POST /login/magic/{email}` — invia un'email con un token e restituisce al
   client un secondo token `claim`. Crea l'utente se non esiste e la
   registrazione è aperta.
2. La pagina `/magic` riceve il token dal link e chiama `POST /login/claim` con
   il token email nell'header e il `claim` nel body. I due token condividono un
   `fingerprint`: il link deve essere aperto **nello stesso browser** che ha
   richiesto l'accesso.

### Registrazione e conferma email

- `POST /login/signup` — crea l'account (disattivabile con
  `USERS_OPEN_REGISTRATION=false`). Se l'invio dell'email di conferma fallisce,
  la creazione viene annullata.
- `GET /login/confirm-email` — conferma tramite token monouso.
- `POST /users/send-validation-email` — reinvia il link all'utente loggato
  (endpoint del template, max 5/ora).
- Con `REQUIRE_EMAIL_VALIDATION=true` gli account non confermati non possono
  accedere.

### Recupero password

`POST /login/recover/{email}` invia il link; `POST /login/reset` imposta la nuova
password e revoca tutte le sessioni.

### Sessioni

- `POST /login/refresh` — scambia il refresh token (nell'header) con una nuova
  coppia; il vecchio viene revocato (**rotazione**, un riuso viene rifiutato). I
  refresh token sono salvati come hash.
- `POST /login/revoke` — revoca il refresh token corrente (logout).
- `POST /login/logout-all` — revoca immediatamente tutte le sessioni dell'utente.
- Cambio password/email, reset e modifiche TOTP incrementano la
  `session_version` dell'utente: tutti i token emessi prima diventano invalidi.
- Una sessione non supera `SESSION_MAX_LIFETIME_SECONDS` anche se rinnovata; ogni
  utente ha al massimo `MAX_REFRESH_SESSIONS_PER_USER` sessioni.

### Autenticazione recente

Operazioni sensibili — cambio email/password, eliminazione del proprio account,
tutte le operazioni amministrative su `/users/*` — richiedono un login avvenuto
negli ultimi `RECENT_AUTH_EXPIRE_SECONDS` (default 5 minuti). Il rinnovo con
refresh token non estende questa finestra; `POST /login/reauth` sì.

## Endpoint utenti

| Metodo | Percorso | Accesso |
| --- | --- | --- |
| `GET` | `/users/me` | utente attivo |
| `PUT` | `/users/me` | utente attivo; se l'account ha una password, **ogni** modifica richiede la password attuale nel campo `original`; cambio email/password richiede anche auth recente. Ruolo, stato e privilegi non sono modificabili da qui. |
| `DELETE` | `/users/me` | auth recente |
| `POST` | `/users/send-validation-email` | utente attivo |
| `GET` | `/users/` | ruolo `admin` + auth recente |
| `POST` | `/users/create` | ruolo `admin` + auth recente |
| `POST` | `/users/toggle-state` | ruolo `admin` + auth recente |
| `GET` / `POST` / `DELETE` | `/users/{user_id}` | ruolo `admin` + auth recente |

L'elenco completo con gli schemi è su http://localhost:8000/docs.

## Ruoli e permessi

Ogni utente ha `role` (default `"user"`) e `is_superuser`. Un superuser supera
qualsiasi controllo di ruolo. Il superuser iniziale (`FIRST_SUPERUSER`) viene
creato da `prestart` con email già confermata.

```python
from typing import Annotated
from fastapi import APIRouter, Depends

from app.deps import SessionDep
from app.src.auth.api.deps import CurrentUser, RequireRole
from app.src.auth.models import CustomUser

router = APIRouter()
User = Annotated[CustomUser, Depends(CurrentUser)]


@router.get("/mine")
def read_mine(db: SessionDep, user: User) -> list[ThingRead]: ...


@router.delete("/{thing_id}", dependencies=[Depends(RequireRole(["admin", "editor"]))])
def delete_thing(db: SessionDep, thing_id: uuid.UUID) -> None: ...
```

- `CurrentUser` — utente autenticato e attivo, altrimenti `401`/`400`.
- `RequireRole([...])` — `403` se il ruolo non è nella lista (superuser esclusi).
- Per l'auth recente nelle tue rotte usa `auth.deps.get_recent_user` da
  `app.src.auth.service`.

Sul frontend, il getter `isAdmin` dello store auth e il middleware `moderator`
proteggono le pagine amministrative. Sono controlli di UX: la sicurezza è sempre
garantita dal backend.

## Estendere il modello utente

`app/src/auth/models.py` contiene il campo di esempio `language`. Per aggiungere
un campo:

```python
class CustomUser(BaseUser):
    language: str = Field(default="en", max_length=10)
    company: str | None = Field(default=None, max_length=255)

class CustomUserCreate(BaseUserCreate):
    company: str | None = Field(default=None, max_length=255)

class CustomUserRead(BaseUserRead):
    company: str | None

class CustomUserUpdate(BaseUserUpdate):
    company: str | None = Field(default=None, max_length=255)
```

Poi:

1. `make backend_makemigrations MESSAGE="add user company"` e verifica la revisione;
2. `make api_generate` per aggiornare i tipi `CustomUser*` del frontend;
3. aggiungi il campo allo stato di `frontend/app/stores/auth.ts` e alle pagine
   impostazioni.

`CustomUser` **non** deve avere `table=True`: la libreria crea la tabella `user`
a partire da esso.

## Email

Magic link, conferma, recupero password e form contatti richiedono SMTP. I
template HTML sono quelli distribuiti con la libreria; per personalizzarli
imposta `EMAIL_TEMPLATES_DIR`. Con SMTP non configurato gli endpoint che inviano
email rispondono `503`. Configurazione in [Configurazione → Email](configuration.md#email-smtp).

## Rate limiting

Il middleware applica limiti predefiniti della libreria alle rotte sensibili
(login, signup, magic link, reset, TOTP…) e limiti espliciti alle estensioni del
template (`/services/contact` e `/users/send-validation-email`: 5 richieste/ora).
Il superamento produce `429` con `Retry-After`. Per una rotta tua:

```python
from fastapi_myauth.rate_limit import rate_limit

@router.post("/expensive")
@rate_limit(limit=10, window_seconds=60)
def expensive(...): ...
```

`@rate_limit(exempt=True)` esclude una rotta (come `/health-check/`).

I contatori sono in memoria per processo. Con più worker o repliche imposta
`RATE_LIMIT_REDIS_URL`; dietro un reverse proxy configura gli indirizzi proxy
fidati con la variabile `FORWARDED_ALLOW_IPS` letta da Uvicorn perché l'IP client sia corretto.

## Social login e passkey (opzionali)

`fastapi-myauth` supporta provider OAuth/OIDC e WebAuthn, non attivi nel template.
Per abilitarli:

1. aggiungi gli extra in `backend/pyproject.toml`
   (`fastapi-myauth[social]==1.6.0`, `fastapi-myauth[passkeys]==1.6.0`) ed esegui
   `uv lock`;
2. passa `social_providers=(SocialProvider(...),)` e/o
   `passkey_config=PasskeyConfig(rp_id=..., origins=(...,))` a `FastAuth` in
   `app/src/auth/service.py`;
3. rigenera il client API e implementa la UI.

Le tabelle `socialaccount`, `passkeycredential` e `passkeyceremony` sono già
create dalle migrazioni. Consulta la documentazione della libreria per i dettagli.

## Client frontend

| File | Ruolo |
| --- | --- |
| `app/stores/tokens.ts` | Store Pinia `tokens`: access/refresh token, persistiti in cookie; login password/magic/TOTP; `refreshTokens()` con deduplica delle richieste concorrenti. |
| `app/stores/auth.ts` | Store `authUser`: profilo utente (cookie, 90 giorni), `logIn`, `logOut`, `getUserProfile`, aggiornamento profilo, TOTP, conferma email, recupero/reset password. Getter `loggedIn`, `isAdmin`. |
| `app/plugins/api.ts` | Crea i client `$api` (autenticato) e `$publicApi`. |
| `app/api/transport.ts` | Aggiunge il Bearer, ripete una volta dopo `401` con token rinnovato, esegue il logout se il rinnovo fallisce, notifica i `403`. |
| `app/middleware/` | `authenticated`, `anonymous`, `moderator`. |
| `app/pages/(auth)/` | `login`, `signup`, `magic`, `totp`, `recover-password`, `reset-password`. |
| `app/pages/settings/` | Profilo (`index.vue`) e sicurezza/TOTP (`security.vue`). |
| `app/pages/moderation.vue` | Gestione utenti per amministratori. |

Dopo cambio password o email il client torna al login. La UI non include ancora
form per ri-autenticazione, login con recovery code, rigenerazione dei codici,
passkey e social login: gli endpoint esistono e possono essere integrati.

## Aggiornare `fastapi-myauth`

La versione è fissata (`==1.6.0`) perché le minor possono cambiare contratti e
schema. Per aggiornare: leggi il changelog della libreria, aggiorna il vincolo,
`uv lock`, genera ed esamina una migrazione, `make api_generate`, adatta gli store
e verifica con `make check test`.
