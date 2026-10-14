# Nuxt frontend

Use Bun from `../.bun-version` and Node from `../.node-version`. The committed
`bun.lock` is the source of dependency versions.

From the repository root:

```sh
make frontend_setup
make dev_frontend_local
make lint_frontend
make typecheck
make test_frontend
```

Or from this directory:

```sh
bun install --frozen-lockfile
bun run dev --dotenv ../.env
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
bun run preview
```

The production container and CI allocate up to 4 GiB to Node's build heap.
For a host build with the same limit, run
`NODE_OPTIONS=--max-old-space-size=4096 bun run build`.

`postinstall` prepares Nuxt's generated ESLint and TypeScript configuration.
Tests run with Bun's built-in test runner. Formatting uses Prettier and its
Tailwind plugin. Markdown content retains its MDC formatting conventions.

Container development uses Compose Watch to sync source and rebuild when
`package.json` or `bun.lock` changes. Dependencies stay inside the Linux image;
the host's `node_modules` is not mounted into the container.

The API URL, websocket URL and application name use `NUXT_PUBLIC_*` settings
from the root `.env`. Analytics is disabled until both `NUXT_UMAMI_ID` and
`NUXT_UMAMI_HOST` are configured at build time. See
[deployment](../docs/deployment.md) for production hosting.
