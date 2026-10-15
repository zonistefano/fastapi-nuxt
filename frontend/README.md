# Frontend

Applicazione Nuxt 4 del template. Bun da `../.bun-version`, Node da
`../.node-version`; le versioni delle dipendenze sono in `bun.lock`.

Dalla root:

```sh
make dev_frontend_local   # oppure make dev per l'intero stack in container
make lint_frontend
make typecheck
make test_frontend
make api_generate         # dopo modifiche alle API del backend
```

Da questa directory: `bun install --frozen-lockfile`, `bun run dev --dotenv ../.env`,
`bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run test`,
`bun run build`, `bun run preview`.

Non modificare `app/api/generated/` né `openapi.json` a mano: sono generati dal
backend.

Documentazione:

- [Frontend](../docs/frontend.md) — pagine, layout, store, i18n, contenuti, tema
- [Client API tipizzato](../docs/api-client.md)
- [Autenticazione → Client frontend](../docs/authentication.md#client-frontend)
