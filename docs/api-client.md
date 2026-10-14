# OpenAPI → TypeScript API client

FastAPI routes and Pydantic/SQLModel schemas are the source of truth for API
paths, request bodies, path/query parameters and response types. The pinned
[`@hey-api/openapi-ts`](https://heyapi.dev/docs/openapi/typescript/get-started)
generator produces a Fetch SDK and TypeScript models for every OpenAPI operation.
Version 0.87.5 supports the project's pinned Node 22.14 runtime.

## Update the contract

Install both stacks with `make setup`, then run from the repository root:

```sh
make api_generate
make typecheck
make api_check
```

Or from `frontend/`: `bun run api:generate` and `bun run api:check`.
Both commands export the current backend contract using the locked Python
environment. No HTTP server, PostgreSQL, Redis or SMTP connection is required.
The exporter supplies public placeholder configuration in its own process; it
does not read the project `.env` or change persistent secrets.

Commit the schema in `frontend/openapi.json` and all files in
`frontend/app/api/generated/` alongside the backend change. Generation formats
the output with the project's Prettier configuration. Do not edit these files
manually. `make api_check` regenerates in a temporary directory and compares the
schema and all SDK files, including removed/added files, without rewriting them.
It is included in `make check` and frontend CI. Frontend builds use the committed
SDK and do not need Python or a running API.

Declare request and response models on new backend endpoints so their OpenAPI
types are specific. Operations use `{first_tag}_{function_name}` IDs, such as
`users_read_user_me`, which become `usersReadUserMe` in TypeScript. Keep function
names unique within a tag; changing a tag or function name changes the generated
SDK export name. The backend test checks uniqueness.

## Call an endpoint in Nuxt

The Nuxt plugin creates `$api` and `$publicApi` for each application instance.
Use `$api` for the signed-in user's endpoints. Its transport reads the current
access token, retries once after a 401 with a refreshed token, logs out when
renewal fails, and displays permission errors for a 403. Refresh requests are
shared within the token store; separate SSR users have separate stores/clients.
The base URL comes from `NUXT_PUBLIC_API_URL` at runtime.

```vue
<script setup lang="ts">
import { usersReadUserMe, usersUpdateUserMe } from "~/api/generated"
import type { CustomUserUpdate } from "~/api/generated"

const { $api } = useNuxtApp()
const { data: profile, error } = await useAsyncData("my-profile", () =>
  usersReadUserMe({ client: $api }),
)

async function changeLanguage(language: string) {
  const body: CustomUserUpdate = { language }
  profile.value = await usersUpdateUserMe({ client: $api, body })
}
</script>
```

The response type is inferred. Path and query parameters use the generated
`path` and `query` options. OAuth login uses form serialization from the schema:

```ts
import { loginLoginWithOauth2 } from "~/api/generated"

const { $publicApi } = useNuxtApp()
const tokens = await loginLoginWithOauth2({
  client: $publicApi,
  body: { username: "user@example.com", password: "password" },
})
```

Use `$publicApi` for login, signup, refresh, recovery and contact requests. Pass
an explicit ``headers: { Authorization: `Bearer ${token}` }`` for refresh or
challenge tokens. It does not renew tokens automatically. SDK calls return parsed
data and reject on HTTP errors. TypeScript types describe the contract; they do
not validate arbitrary response data at runtime.

Pages and stores import SDK functions and API types directly from
`~/api/generated`. Adding an endpoint requires regenerating the contract and
calling its generated function where needed; no hand-written endpoint wrapper
or type alias is required. Response types are inferred from the SDK function.
Use generated model types when declaring a request body or a typed UI ref.

The hand-written Nuxt plugin and transport configure shared behavior such as
the API URL, authentication and token renewal once for all endpoints. Stores
contain application behavior such as updating session state and displaying
notifications. Local UI state normalizes optional/null profile values without
changing the generated API types; types specific to the UI are independent of
the backend contract.

The integration also aligns contact with `/services/contact` and user-state
changes with `{ user_email }`. The authenticated
`POST /users/send-validation-email` extension supplies the existing profile
screen with a confirmation challenge compatible with `/login/confirm-email`.
It requires configured email delivery and has a per-user request limit.
