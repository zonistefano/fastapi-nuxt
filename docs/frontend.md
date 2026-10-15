# Frontend

Applicazione Nuxt 4 in `frontend/`, con i sorgenti in `frontend/app/` (`srcDir`
di Nuxt 4). Bun è il package manager e il runtime di produzione (preset Nitro
`bun`); Node 22.14 è richiesto da alcuni strumenti di build.

## Comandi

Dalla root:

```sh
make frontend_setup       # bun install --frozen-lockfile (+ nuxt prepare)
make dev_frontend         # dev server containerizzato
make dev_frontend_local   # dev server sull'host con ../.env
make lint_frontend        # ESLint, zero warning ammessi
make typecheck            # nuxt typecheck (vue-tsc)
make test_frontend        # bun run test (bun test + copertura)
make format_frontend      # eslint --fix + prettier --write
make build_frontend       # immagine di produzione
```

Da `frontend/`: `bun run dev | build | preview | generate | lint | lint:fix |
format | format:check | typecheck | test | api:generate | api:check`.

Il build in CI e nel container usa `NODE_OPTIONS=--max-old-space-size=4096`; per
un build locale equivalente: `NODE_OPTIONS=--max-old-space-size=4096 bun run build`.

## Moduli Nuxt

| Modulo | Uso |
| --- | --- |
| `@nuxt/ui` 4 | Componenti (`U*`), tema, toast, layout dashboard; include Tailwind CSS 4 e Color Mode |
| `@nuxt/content` 3 | Contenuti Markdown/YAML con collezioni tipizzate (SQLite nativo) |
| `@nuxtjs/i18n` | Traduzioni UI e rotte localizzate |
| `@pinia/nuxt` + `pinia-plugin-persistedstate` | Store con persistenza in cookie |
| `@nuxt/image` | Ottimizzazione immagini |
| `@nuxt/eslint` | Configurazione ESLint generata |
| `nuxt-og-image` | Immagini Open Graph (renderer Takumi, `components/OgImage/`) |
| `nuxt-llms` | Genera `/llms.txt` dai contenuti |
| `nuxt-umami` | Analytics, disattivate finché `NUXT_UMAMI_ID` e `NUXT_UMAMI_HOST` non sono impostate |

## Struttura di `app/`

```text
app/
├── api/
│   ├── generated/        # SDK e tipi generati da OpenAPI — non modificare
│   └── transport.ts      # fetch autenticato con rinnovo token
├── assets/css/main.css   # import di Tailwind e Nuxt UI, @source dei contenuti
├── components/
│   ├── layout/           # Header, Footer
│   ├── authentication/   # navigazione delle pagine auth
│   ├── bpmn/             # editor BPMN demo (canvas, palette, toolbar, nodi)
│   ├── content/          # componenti usati nelle pagine di contenuto
│   ├── locale/           # selettore lingua
│   ├── OgImage/          # template OG image
│   └── *.vue             # componenti demo della landing
├── layouts/              # default, authentication, dashboard, docs, bpmn
├── middleware/           # authenticated, anonymous, moderator
├── pages/
├── plugins/api.ts        # fornisce $api e $publicApi
├── stores/               # auth.ts, tokens.ts
├── utilities/            # helper (import espliciti da "@/utilities")
├── app.vue               # head, titleTemplate, OG image, caricamento profilo
├── app.config.ts         # tema Nuxt UI (colore primario)
└── error.vue
```

`utilities/` non è una directory auto-importata da Nuxt (a differenza di
`utils/`): importa gli helper esplicitamente, es.
`import { readableDate } from "@/utilities"`.

## Pagine

| Rotta | File | Layout | Middleware |
| --- | --- | --- | --- |
| `/` | `pages/index.vue` (contenuto `index.yml`) | default | — |
| `/login`, `/signup`, `/magic`, `/totp`, `/recover-password`, `/reset-password` | `pages/(auth)/*.vue` | authentication | `anonymous` |
| `/settings`, `/settings/security` | `pages/settings.vue` + `pages/settings/*.vue` | dashboard | `authenticated` |
| `/moderation` | `pages/moderation.vue` | dashboard | `moderator` |
| `/blog`, `/blog/:slug` | `pages/blog/` | default | — |
| `/docs/:slug*` | `pages/docs/[...slug].vue` | docs | — |
| `/changelog` | `pages/changelog.vue` | default | — |
| `/pricing` | `pages/pricing.vue` | default | — |
| `/contact` | `pages/contact.vue` (`POST /services/contact`) | default | — |
| `/bpmn-editor` | `pages/bpmn-editor.vue` | bpmn | — |
| altre (es. `/privacy`) | `pages/[...slug].vue` (collezione `general_*`) | default | — |

Il gruppo `(auth)` organizza i file senza aggiungere un segmento all'URL. Ogni
rotta esiste anche con prefisso `/it`.

## Layout

| Layout | Uso |
| --- | --- |
| `default` | Header + contenuto + footer; sito pubblico |
| `authentication` | Pagine di login/registrazione |
| `dashboard` | `UDashboardGroup` con sidebar collassabile: link impostazioni; link moderazione visibile solo ai superuser |
| `docs` | Navigazione laterale della documentazione |
| `bpmn` | Area a schermo intero per l'editor |

Una pagina sceglie il layout con `definePageMeta({ layout: "dashboard" })`. Per
aggiungere voci alla sidebar modifica gli array `links` in `layouts/dashboard.vue`;
per il sito pubblico l'array delle voci in `components/layout/Header.vue`.

## Middleware

| Nome | Comportamento |
| --- | --- |
| `authenticated` | Se l'utente non è loggato mostra un toast di permesso negato e blocca la navigazione. |
| `anonymous` | Se l'utente è già loggato reindirizza alla home (per le pagine auth). |
| `moderator` | Consente l'accesso solo se `authStore.isAdmin`. |

```ts
definePageMeta({ layout: "dashboard", middleware: ["authenticated"] })
```

## Stato e autenticazione

- `useTokenStore()` conserva access e refresh token (cookie) e gestisce login e
  rinnovo. `hasValidToken` è vero solo per una sessione: le sfide TOTP e i
  claim del magic link non contano, quindi `logIn`, `magicLogin` e `totpLogin`
  caricano il profilo solo dopo l'ultimo passaggio del login.
- `useAuthStore()` conserva il profilo (cookie, 90 giorni) ed espone
  `loggedIn`, `isAdmin`, `logIn`, `logOut`, `getUserProfile`, `updateUserProfile`…
- `app.vue` chiama `authStore.getUserProfile()` a ogni caricamento, anche in SSR:
  i cookie rendono disponibili i token sul server.

Dettagli in [Autenticazione → Client frontend](authentication.md#client-frontend).

## Chiamare l'API

```ts
import { usersReadUserMe } from "~/api/generated"

const { $api } = useNuxtApp()
const { data: me } = await useAsyncData("me", () => usersReadUserMe({ client: $api }))
```

Usa `$api` per le rotte autenticate e `$publicApi` per quelle pubbliche. Guida
completa in [Client API tipizzato](api-client.md).

## Internazionalizzazione

Configurazione in `nuxt.config.ts`:

- lingue `en` (default) e `it`, file in `i18n/locales/{en,it}.ts`;
- strategia `prefix_and_default`: l'inglese è servito senza prefisso (`/blog`) e
  con prefisso (`/en/blog`), l'italiano con `/it/blog`;
- rilevamento lingua del browser solo sulla root, memorizzato nel cookie
  `i18n_redirected`.

Nei componenti usa `const { t } = useI18n()` e `useLocalePath()` per i link:

```vue
<ULink :to="localePath('/settings')">{{ t("nav.settings") }}</ULink>
```

Fuori dai componenti (store, plugin, middleware) usa `translate` da
`@/utilities`. Le chiavi sono raggruppate per area (`common`, `nav`,
`validation`, `notifications`, …): aggiungi ogni chiave in **tutti** i file di
lingua.

### Aggiungere una lingua

1. Crea `i18n/locales/<codice>.ts` e aggiungi la voce in `i18n.locales`.
2. Aggiungi il codice all'array `locales` in `content.config.ts` e crea
   `content/<codice>/` con gli stessi file delle altre lingue.
3. Aggiungi `/<codice>` a `nitro.prerender.routes`.

## Contenuti (Nuxt Content)

`content.config.ts` definisce, per ogni lingua, queste collezioni:

| Collezione | Sorgente | Tipo | Schema |
| --- | --- | --- | --- |
| `index_<lang>` | `<lang>/index.yml` | data | hero, sezioni, feature, testimonial, CTA |
| `pricing_<lang>` | `<lang>/pricing.yml` | page | piani, loghi, FAQ |
| `blog_<lang>` | `<lang>/blog/**/*.md` | page | titolo, descrizione, immagine, autori, data, badge |
| `changelog_<lang>` | `<lang>/changelog/**/*.md` | page | titolo, descrizione, data, immagine |
| `docs_<lang>` | `<lang>/docs/**/*.md` | page | libero (`.navigation.yml` per le sezioni) |
| `general_<lang>` | `<lang>/*.md` | page | libero (es. `privacy.md`) |

Gli schemi Zod condivisi sono in `content/types.ts`; i campi non validi fanno
fallire il build. Il prefisso numerico dei file (`1.launch.md`) definisce
l'ordine e non compare nell'URL.

Interrogazione da una pagina:

```ts
const { locale } = useI18n()
const { data: posts } = await useAsyncData(useRoute().path, () =>
  queryCollection(`blog_${locale.value}`).all(),
)
```

Il Markdown supporta la sintassi MDC e i componenti Nuxt UI Prose; esempi in
`content/en/docs/2.essentials/`. Tailwind analizza anche i file in `content/`
(direttiva `@source` in `main.css`).

## Tema e stile

- Colore primario: `app.config.ts` → `ui.colors.primary`. Altri token e varianti
  dei componenti si personalizzano nello stesso file (vedi documentazione Nuxt UI).
- CSS globale: `assets/css/main.css`.
- Modalità chiara/scura gestita da Color Mode; `app.vue` aggiorna `theme-color`.
- Icone: set Heroicons (`i-heroicons-*`) via Iconify.
- Prettier con `prettier-plugin-tailwindcss` ordina le classi.

## SEO e metadati

- `app.vue` imposta `titleTemplate` (`<pagina> - <appName>`) e l'OG image di default.
- Nelle pagine usa `useSeoMeta({ title, description, ogTitle, ogDescription })`.
- `site.url` in `nuxt.config.ts` deve essere l'URL pubblico reale.
- `/` e `/it` sono prerenderizzate al build (`nitro.prerender`, `failOnError`).

## Editor BPMN (demo)

`/bpmn-editor` usa Vue Flow (`@vue-flow/core`, `background`, `minimap`) con nodi
personalizzati per eventi, task e gateway, palette, toolbar (zoom) e pannello
proprietà. È solo client-side: il diagramma non viene salvato. Il modulo backend
`bpmn` è il punto previsto per aggiungere persistenza.

## Configurazione runtime

`runtimeConfig.public` (`appName`, `apiUrl`, `apiWS`) viene sovrascritto a runtime
da `NUXT_PUBLIC_APP_NAME`, `NUXT_PUBLIC_API_URL`, `NUXT_PUBLIC_API_WS`. Le chiavi
private (fuori da `public`) sono disponibili solo sul server Nitro. Vedi
[Configurazione → Frontend](configuration.md#frontend).

## Test

`frontend/tests/` usa il runner integrato di Bun (`bun:test`) e copre la logica
non-UI: utility, transport, store, middleware e plugin. Componenti e pagine non
sono testati (servirebbero `@nuxt/test-utils` e Vitest).

| File | Contenuto |
| --- | --- |
| `setup.ts` | precaricato da `bunfig.toml`: installa i finti auto-import Nuxt e registra gli store |
| `nuxt.ts` | doppioni di test e helper: `resetNuxt()`, `mockApi()`, `toasts`, `navigations`, `requests`, `jwt()`, `sessionTokens()` |
| `tsconfig.json` | estende `.nuxt/tsconfig.app.json` per risolvere gli alias `~` e `@` (passato con `--tsconfig-override`) |
| `api-client.test.ts` | serializzazione dell'SDK generato e transport (retry dopo 401, logout, 403) |
| `stores/*.test.ts` | `useTokenStore()` e `useAuthStore()`: login, magic link, TOTP, refresh, profilo, recupero password |
| `middleware.test.ts`, `plugins/api.test.ts` | middleware di rotta e plugin `$api`/`$publicApi` |
| `utilities.test.ts` | funzioni di `app/utilities/` |
| `i18n.test.ts` | stesse chiavi in `en.ts` e `it.ts`, nessun testo vuoto, stessi file in `content/en` e `content/it` |
| `coverage.test.ts` | importa ogni modulo di `api/`, `composables/`, `middleware/`, `plugins/`, `stores/`, `utilities/` |

Nei test gli auto-import (`useNuxtApp`, `useToast`, `navigateTo`, `defineStore`,
…) sono sostituiti da `tests/nuxt.ts`; `$api` e `$publicApi` sono client
generati veri con un `fetch` finto che risponde alle rotte registrate con
`mockApi("METHOD /percorso", corpo | handler)` (404 altrimenti). Chiama
`resetNuxt()` in `beforeEach` per ripartire con Pinia, mock e registri vuoti.
Se il codice usa un nuovo auto-import Nuxt, aggiungilo a `installNuxtGlobals()`.

```ts
import { beforeEach, expect, test } from "bun:test"
import { mockApi, requests, resetNuxt, sessionTokens } from "../nuxt"

beforeEach(() => resetNuxt())

test("loads the profile", async () => {
  useTokenStore().setTokens(sessionTokens())
  mockApi("GET /users/me", { id: "user-1", email: "a@example.com" /* … */ })
  await useAuthStore().getUserProfile()
  expect(requests).toHaveLength(1)
})
```

La copertura è sempre attiva: `bunfig.toml` impone almeno il 95% di righe e
funzioni (il codice generato è escluso) e `bun run test` fallisce sotto soglia.
Bun misura solo i file importati, per questo `coverage.test.ts` carica tutti i
moduli di logica: un nuovo store, composable o utility senza test abbassa la
copertura invece di restare invisibile. Aggiungi i test insieme al codice.

## Container

- `Dockerfile.dev` — dipendenze installate nell'immagine, `bun run dev`; il codice è
  sincronizzato da Compose Watch (i `node_modules` dell'host non sono montati).
- `Dockerfile` — build in uno stage, poi solo `.output/` in un'immagine
  `node:22.14.0-slim` eseguita con Bun come utente `node` sulla porta 3000.
