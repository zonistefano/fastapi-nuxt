# Revisione backend — 14 ottobre 2026

Il backend aveva problemi concreti di sicurezza, integrazione e copertura dei
test. Le correzioni rendono più affidabile la base per nuovi progetti. La revisione
non equivale a una garanzia di assenza di bug: distingue le verifiche eseguite
dalle funzionalità ancora da realizzare.

## Compatibilità con auth v1.6.0

Il lockfile iniziale installava `fastapi-myauth` **1.5.3** e la dipendenza
`==1.*` non documentava una versione verificata. È stato confrontato il sorgente
del [tag ufficiale v1.6.0](https://github.com/zonistefano/fastapi_auth/tree/v1.6.0),
commit `4daa670543e7188ba9693c73131ec3290219102a`.

La versione 1.6 richiede FastAPI `0.143.*` e SQLModel `0.0.48`; modifica i token,
la gestione delle sessioni e le risposte delle operazioni TOTP. La repo ora
vincola esplicitamente auth a `1.6.0` e include il lockfile risolto. Non è un
semplice aggiornamento di versione: la nuova migrazione e gli adattamenti del
client sono necessari per usare correttamente i nuovi contratti.

## Problemi riscontrati e corretti

| Priorità | Problema iniziale | Correzione |
| --- | --- | --- |
| Alta | `GET /` nel modulo BPMN restituiva l'elenco utenti senza autenticazione. | Rimossa la rotta impropria; amministrazione tramite `/users/` con ruolo admin e autenticazione recente. Test per visitatore, utente normale e amministratore. |
| Alta | Configurazione e migrazione non sufficienti per auth 1.6: mancavano versione di sessione, storage hash dei refresh, challenge e recovery code. | Aggiunta migrazione Alembic, verificata su database vuoto e utenti preesistenti; conservazione delle credenziali e revoca delle sessioni legacy. |
| Alta | Lo schema precedente usava timestamp PostgreSQL senza fuso, mentre SQLModel 0.0.48 richiede timestamp con fuso. | Conversione esplicita da UTC, verificata anche con connessione impostata su Europe/Rome; confronto automatico dello schema con i modelli. |
| Alta | Campo `language` nullable nelle API ma obbligatorio nel database; mancavano vincoli sulle lunghezze. | Default `en` in creazione, limiti coerenti e rifiuto di null esplicito; omissione in aggiornamento conserva il valore. |
| Media | Contatto email chiamava `send_web_contact_email` senza `config`; il mock del test nascondeva l'errore. Il percorso dei template puntava inoltre a file assenti. | Configurazione esplicita, template distribuiti dalla libreria e risposta 503 per invio indisponibile/fallito. Test con lettura del template reale e mock del solo trasporto SMTP. |
| Media | Impostazioni auth duplicate: variabili come chiusura registrazioni, SMTP SSL e nuovi limiti di sessione non venivano caricate. | Eredità dalla configurazione della libreria e caricamento tramite BaseSettings, mantenendo obbligatorie chiavi e credenziali bootstrap. |
| Media | Mancava l'applicazione del rate limiting; i quattro worker avrebbero comunque avuto contatori in memoria separati. | Middleware attivo, limiti sensibili e contatto, eccezione per health probe, supporto Redis condiviso e un worker di default. |
| Media | CRUD generico tentava di cancellare `None`, paginava senza ordine e committava ogni operazione anche in un servizio composto. | Cancellazione mancante sicura, ordine per chiave primaria, rifiuto pagine negative e partecipazione alle transazioni auth. Dipendenza DB condivisa per nuove rotte protette. |
| Media | Parsing CORS da stringa incompleto e URL DB fragile con caratteri speciali nelle credenziali. | Parsing JSON/stringa separata da virgole, rifiuto wildcard con credenziali e costruzione URL tramite SQLAlchemy. Porta PostgreSQL configurabile e validata. |
| Media | Il client conservava token revocati dopo modifiche TOTP/password/email e leggeva un nome errato per l'indicatore TOTP. | Salvataggio dei token sostitutivi, codici recovery mostrati una volta, nuova autenticazione dopo cambio credenziali e gestione dell'alias `totp`. Revoca refresh inviata con il token refresh. |
| Bassa | Disabilitare la documentazione lasciava pubblico `/openapi.json`; mancava cleanup dei record auth scaduti. | Disabilitazione completa delle tre rotte documentazione; task periodico e comando CLI per cleanup. |

Sono stati inoltre semplificati l'aggiornamento dei modelli CRUD, l'inizializzazione
del filtro di logging e il passaggio della configurazione auth. Il pool verifica
le connessioni riutilizzate (`pool_pre_ping`); gli URL Celery sono configurabili.

## Completezza come template e showcase

Sono presenti avvio con migrazioni, bootstrap amministratore, modelli utente
estendibili, autenticazione password/magic/TOTP, permessi amministrativi,
rotazione/revoca sessioni, recupero account, invio email, limiti HTTP e task di
manutenzione. L'architettura delega i meccanismi auth alla libreria invece di
reimplementarli nel template.

I moduli backend chat, editor e BPMN sono scaffolding: non contengono API di
dominio, persistenza dei documenti o motore workflow. Le pagine frontend demo
non devono essere presentate come prova di tali capacità backend. È appropriato
mantenere questi punti di estensione nel template, rendendone esplicito lo stato.

Social login e passkeys richiedono extras e configurazioni specifiche del nuovo
progetto. Il client showcase copre le operazioni TOTP esistenti, ma non offre
ancora interfacce per reautenticazione recente, login con recovery code,
rigenerazione recovery code, gestione passkeys o collegamento provider social.
I relativi endpoint auth sono disponibili secondo la configurazione scelta.

Con SMTP vuoto, magic login, conferma e recupero via email non costituiscono una
demo completa: occorre configurare mailcatcher o un servizio SMTP. La probe
`/health-check/` segnala liveness; non verifica disponibilità corrente di DB/SMTP.
Il servizio prestart verifica il DB prima di applicare migrazioni e bootstrap.

## Verifiche e limiti

Esito finale: **52 test backend passati sia su SQLite sia su PostgreSQL 17**,
4 test tooling e 5 test Bun passati; lint/formatting e typecheck passati.
Copertura del codice applicativo: **78%**. Wheel/sdist e immagini backend di
sviluppo/produzione costruiti correttamente. Smoke test dell'immagine di
produzione eseguito senza rete, come utente non root, verificando API,
template email distribuiti e assenza di pytest nell'immagine.

La suite verifica configurazione, bootstrap, autorizzazione, campi custom,
rotazione/hash dei refresh, revoca immediata, cambio password, autenticazione
recente, rollback in caso di email fallita, conferma email monouso, magic login,
reset password, enrollment/recovery/disable TOTP, cleanup e migrazioni. SQLite
è utilizzato per test locali isolati; PostgreSQL 17 è verificato tramite Compose
con database temporaneo e schema dedicato ai test di migrazione.

Sono controllati anche lint/formatting Python, packaging wheel/sdist, build
Docker di sviluppo/produzione, lint e tipi del client modificato e i test Bun.
La copertura riguarda il codice dell'applicazione, non il codice interno della
libreria auth; una percentuale alta non sostituisce test sui comportamenti.

Non sono stati eseguiti test end-to-end nel browser, invii a un server SMTP reale,
prove di carico/concorrenza distribuita, né dimostrazioni con provider social,
autenticatori WebAuthn o Redis condiviso. Questi sono limiti della verifica, non
funzionalità dimostrate. Rimane una segnalazione di deprecazione upstream del
TestClient Starlette con httpx; la suite passa.

Prima dell'upgrade su un'installazione esistente, seguire
[le istruzioni backend](README_backend.md#authentication-16): backup, verifica
della convenzione UTC dei dati storici, migrazione e nuovo login. Le chiavi
persistenti devono rimanere le stesse. I test eseguiti non usano il DB di sviluppo.
