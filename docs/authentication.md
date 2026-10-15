# Autenticazione

L'autenticazione è delegata alla libreria [`fastapi-myauth`](https://github.com/zonistefano/fastapi_auth),
fissata alla versione **1.7.0**. Il template non reimplementa i meccanismi di
sicurezza: li configura, estende il modello utente e fornisce il client Nuxt.

La 1.7.0 fornisce le API pubbliche per popup OAuth, discovery dei metodi e schema
completo. Il template usa direttamente `auth.get_router(include_disabled_methods=True)`;
la [specifica dell'intervento nella libreria](auth-library-handoff.md) conserva
il contesto della migrazione, senza costituire una guida d'uso aggiornata.

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

Nella pagina `/signup` del frontend, con la password attiva viene chiamato
`POST /login/signup` e poi il login; se il backend risponde con un messaggio
(conferma email richiesta) l'utente viene rimandato a `/login`. Senza password
la registrazione passa dal magic link, che crea l'account se non esiste.

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

Gli extra `social` e `passkeys` della versione **1.7.0** sono installati. I due
metodi restano disabilitati fino alla configurazione (`SOCIAL_PROVIDERS=[]`,
`PASSKEY_CONFIG=null`). `GET /login/methods` comunica al frontend i provider
abilitati, la disponibilità delle passkey e lo stato della registrazione. Con
registrazione chiusa, signup mostra il relativo messaggio e rimanda al login. Le
rotte opzionali sono sempre nel contratto generato tramite l'opzione pubblica
`include_disabled_methods=True` e rispondono `404` quando il metodo non è
configurato. Non servono configurazioni passkey fittizie o factory interni.

### OAuth/OIDC

Configura `SOCIAL_PROVIDERS` come lista JSON di provider. Ogni oggetto accetta
`name`, `client_id`, `client_secret`, `server_metadata_url`,
`trusts_email_verification` (default `false`), `scopes` e i nomi dei claim
`subject_claim`, `email_claim`, `name_claim`, `email_verified_claim`.
La validazione e la conversione sono fornite da `SocialProviderConfig` della
libreria; `to_provider()` estrae il segreto per il client OAuth. Non registrare
nei log il provider convertito. Le credenziali sono fornite dal provider:
`make init` non le genera. Non
inserirle nel frontend o nei file committati. Gli URL dei metadata richiedono
HTTPS, salvo localhost per i test di sviluppo.

Esempio di struttura (sostituisci i placeholder con credenziali esterne al repository):

```dotenv
SOCIAL_PROVIDERS=[{"name":"google","client_id":"REPLACE_WITH_PROVIDER_CLIENT_ID","client_secret":"REPLACE_WITH_PROVIDER_SECRET","server_metadata_url":"https://accounts.google.com/.well-known/openid-configuration","trusts_email_verification":true}]
```

Per Google il metadata URL è
`https://accounts.google.com/.well-known/openid-configuration`, con i claim
predefiniti; puoi impostare `trusts_email_verification=true` per fidarti del
claim `email_verified`. Per un altro IdP configura i claim secondo il suo
contratto, evitando di fidarti di email non verificate.

Registra nell'IdP il callback
`https://api.example.com/login/social/<name>/callback`. Dietro reverse proxy,
mantieni l’header `Host` pubblico e configura `FORWARDED_ALLOW_IPS` con gli
indirizzi fidati affinché Uvicorn rispetti lo schema HTTPS inoltrato dal proxy. Il frontend mostra
automaticamente i provider configurati su login e signup. La libreria gestisce
state, nonce, PKCE e verifica dell'identità. Il template aggiunge
`SessionMiddleware` solo quando è configurato almeno un provider, con cookie
HttpOnly, SameSite=Lax e durata di 300 secondi. La chiave persistente separata
`SOCIAL_SESSION_SECRET_KEY` è generata da `make init` ed è obbligatoria quando
si abilita il social login. `SOCIAL_SESSION_HTTPS_ONLY=true` imposta Secure:
usa `false` soltanto nello sviluppo locale con backend HTTP. Questa scelta è
esplicita e non dipende dall'URL del frontend. Il cookie contiene stato, nonce,
verifier PKCE ed eventuale intento di collegamento firmati, non cifrati; non
contiene i token della sessione applicativa.

`GET /login/social/{provider}` e `POST /login/social/{provider}/link`
restituiscono `{url}` al client tipizzato; la UI apre il provider in una finestra
secondaria. `FastAuth(..., social_popup=SocialPopupConfig(...))` seleziona il
trasporto browser della libreria. Il suo callback restituisce una pagina HTML che
trasmette i token tramite `postMessage` alla sola origine `FRONTEND_URL`, poi
chiude la finestra. Il frontend verifica sia l'origine del backend sia la
finestra mittente. I token non passano nella query string o nel fragment.
Il template deriva l'origine destinataria da `FRONTEND_URL`; la libreria la
valida e canonicalizza. Usa HTTPS fuori da localhost/loopback e configura
l'URL pubblico dell'app. CORS deve consentire quell'origine con credenziali.
Gli errori attesi del callback producono HTML con stato HTTP 200 e messaggio
`{type: "auth:social", error: true}`; la UI gestisce il messaggio come errore.
La pagina usa CSP con nonce e header che impediscono cache e framing.
Il popup deve mantenere `window.opener`: verifica le policy COOP lungo l'intera
navigazione verso l'IdP. Per deployment su siti distinti, considera i limiti
sui cookie di terze parti; preferisci frontend e API nello stesso sito.

Nelle impostazioni di sicurezza sono disponibili collegamento e scollegamento
(`DELETE /login/social/{provider}`). L'associazione a un account locale resta
**esplicita**, con autenticazione recente ed email locale verificata. Lo
scollegamento revoca le sessioni; la UI torna al login. Il backend impedisce di
rimuovere l'unico metodo di accesso.

### Passkey / WebAuthn

Configura, ad esempio, `PASSKEY_CONFIG` con un oggetto JSON contenente
`rp_id: "example.com"`, `origins: ["https://app.example.com"]` e opzionalmente
`rp_name`, `timeout_ms`, `challenge_ttl_seconds`. Per sviluppo locale usa
`rp_id: "localhost"` e `origins: ["http://localhost:3000"]`. Non utilizzare
wildcard: RP ID e origini devono corrispondere al deployment.

```dotenv
PASSKEY_CONFIG={"rp_id":"localhost","origins":["http://localhost:3000"],"rp_name":"My application"}
```

La UI usa `@simplewebauthn/browser` per le cerimonie del browser e la libreria
backend per la verifica. Login offre l'accesso con una passkey già registrata;
le impostazioni consentono registrazione, elenco, rinomina e rimozione. Registrazione e rimozione revocano le sessioni: dopo il successo la UI chiede
un nuovo accesso. La registrazione richiede un account esistente e autenticazione recente. Il login
passkey segue anche l'eventuale challenge TOTP della libreria. Per i dettagli
browser vedi la [documentazione del client WebAuthn](https://simplewebauthn.dev/docs/packages/browser).

Il pulsante di accesso è sempre presente quando il backend abilita le passkey;
un browser senza WebAuthn mostra una spiegazione e mantiene disponibili gli altri
metodi. La pagina login attiva anche l'autocompletamento passkey (Conditional UI)
quando supportato, tramite il campo email con `autocomplete="username webauthn"`.
L'attesa non blocca il form: inviare il form password/magic link o scegliere un provider social annulla la
cerimonia pendente, così come uscire dalla pagina. Il pulsante esplicito richiede
una nuova challenge. Errori dell'autocompletamento e annullamenti del browser non
mostrano notifiche di credenziali errate; un errore dell'accesso esplicito consente
di riprovare o scegliere un altro metodo.

#### Invito facoltativo alla creazione

In `frontend/app/app.config.ts`, `auth.passkeyEnrollment` controlla la proposta
dopo il login:

```ts
auth: {
  passkeyEnrollment: {
    enabled: false,
    cooldownDays: 30,
  },
},
```

Il template la lascia disattivata: ogni progetto può abilitarla senza modificare
le API o la configurazione WebAuthn. Se attiva, un banner richiudibile compare
solo dopo un nuovo login completo con password, magic link o social (incluso
l'eventuale TOTP), con WebAuthn disponibile e nessuna passkey registrata. Ripristino
della sessione, rinnovo token, ri-autenticazione e login passkey non propongono
la creazione. La provenienza del challenge passkey viene conservata nello store
anche ricaricando la pagina TOTP. Se discovery o elenco passkey falliscono, il
banner non compare e l'accesso prosegue.

«Crea passkey» apre la sezione Passkey nelle impostazioni di sicurezza, dove
l'utente sceglie il nome e avvia esplicitamente la registrazione. Prima di
aggiungere o rimuovere una passkey, la UI avvisa che servirà accedere nuovamente.
«Non ora», chiusura e apertura delle impostazioni rinviano ulteriori inviti per
`cooldownDays` giorni. Il rinvio usa `localStorage` con chiave
`passkey-enrollment:<id utente>`: è separato per account, vale solo nello stesso
browser e non contiene token né credenziali. Se lo storage è negato, la chiusura
vale per l'invito corrente; cancellare i dati del browser azzera il rinvio.
L'aggiunta manuale nelle impostazioni resta sempre disponibile.

## Client frontend

| File | Ruolo |
| --- | --- |
| `app/stores/tokens.ts` | Store Pinia `tokens`: access/refresh token, persistiti in cookie; login password/magic/TOTP; `refreshTokens()` con deduplica delle richieste concorrenti. |
| `app/stores/auth.ts` | Store `authUser`: profilo utente (cookie, 90 giorni), `logIn`, `logOut`, `getUserProfile`, aggiornamento profilo, TOTP, conferma email, recupero/reset password. Getter `loggedIn`, `isAdmin`. |
| `app/composables/useAuthenticationMethods.ts` | Caricamento condiviso dei metodi disponibili, usato anche nel rendering server di login e signup. |
| `app/plugins/api.ts` | Crea i client `$api` (autenticato) e `$publicApi`. |
| `app/api/transport.ts` | Aggiunge il Bearer, ripete una volta dopo `401` con token rinnovato, esegue il logout se il rinnovo fallisce, notifica i `403`. |
| `app/middleware/` | `authenticated`, `anonymous`, `moderator`. |
| `app/pages/(auth)/` | `login`, `signup`, `magic`, `totp`, `recover-password`, `reset-password`. |
| `app/pages/settings/` | Profilo (`index.vue`) e sicurezza/TOTP (`security.vue`). |
| `app/pages/moderation.vue` | Gestione utenti per amministratori. |

Dopo cambio password o email il client torna al login. Le impostazioni di
sicurezza offrono ri-autenticazione, rigenerazione dei recovery code, logout
globale ed eliminazione dell'account con conferma. Un `403` con dettaglio
`Recent authentication required.` apre il dialogo di ri-autenticazione; dopo
la conferma l'utente ripete l'operazione. Le scritture non vengono ripetute
automaticamente. Account senza password e senza TOTP devono accedere nuovamente
con magic link, provider o passkey.

La pagina TOTP consente anche un recovery code. Un codice errato conserva il
challenge per un nuovo tentativo. I codici di recupero sono mostrati solo nel
modale corrente, mai persistiti. Il rinnovo concorrente è deduplicato; risposte
di rinnovo arrivate dopo logout o cambio sessione vengono scartate e il nuovo
refresh token inutilizzato viene revocato. Il logout esplicito revoca il refresh
token corrente, mentre `clearSession()` cancella solo lo stato locale (errori
401, account eliminato o credenziali cambiate). La revoca del solo refresh non
invalida un access token già emesso: per revocare subito tutti gli accessi usa
il logout globale.

All'avvio il profilo viene letto solo con una sessione utilizzabile: magic link
e challenge TOTP sopravvivono al caricamento della pagina. I cookie malformati
sono trattati come token scaduti. Il profilo persistito serve alla UI; la
sicurezza resta sul backend. Il middleware amministrativo ammette superuser e
ruolo `admin`, sempre con account attivo e sessione valida. Le redirezioni auth
rispettano la lingua corrente. Il link di conferma email `/?token=...` viene
consumato dalla homepage e rimosso tramite redirezione al login.

La moderazione comprende elenco paginato, lettura del singolo utente, modifica
di nome/email/ruolo, attivazione, privilegi superuser, creazione ed eliminazione
con conferma. Tutte le operazioni sono soggette ai controlli amministrativi e
all'autenticazione recente del backend.

## Aggiornare `fastapi-myauth`

La versione è fissata (`==1.7.0`) perché le minor possono cambiare contratti e
schema. Per aggiornare: leggi il changelog della libreria, aggiorna il vincolo,
`uv lock`, genera ed esamina una migrazione, `make api_generate`, adatta gli store
e verifica con `make check test`.
