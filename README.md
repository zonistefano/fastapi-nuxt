# FastAPI + Nuxt template

A starting point for new projects with FastAPI, SQLModel, PostgreSQL, Nuxt and
Bun. The default stack runs the API, frontend and database. Background workers
and administration tools are optional.

Authentication is pinned to `fastapi-myauth` 1.6.0. The backend chat, editor and
BPMN modules are extension points for application features. See the
[backend review](docs/backend-review.md) for verified behavior and showcase limits.

## Create a project

Use GitHub's **Use this template** button or copy the source into a new
repository. Set the project name, public URLs and email addresses in your local
`.env` after initialization. Configure your own security contact and CODEOWNERS
before publishing.

Required for container development: Python 3, GNU Make, Bash, Docker and Docker
Compose 2.32 or newer. Container dependencies are installed in the images; no
host `node_modules` or Python environment is required.

```sh
make init
make dev
```

Open the frontend at http://localhost:3000 and API documentation at
http://localhost:8000/docs. The database is available on localhost:5432.
`make init` generates a separate password and persistent signing/encryption keys
for each project. It fills missing settings and leaves existing values intact.
Get the initial administrator credentials from your local `.env`.

`.env` and other local environment files are ignored by Git. `.env.example`
contains configuration names and empty secret fields. Never put registry tokens
in an environment file committed to the repository. If a token was previously
committed, revoke it at its provider; deleting it does not revoke it.

## Local tools and checks

For host development, install the versions in `.python-version`, `.node-version`,
`.uv-version` and `.bun-version`. uv can download the pinned Python interpreter.
The devcontainer installs the same uv and Bun versions.

```sh
make setup             # initialize and install locked dependencies
make check             # tooling tests, lint, formatting checks and Vue types
make test              # isolated backend tests and Bun frontend tests
make build             # production backend and frontend images
make pre_commit_install # optional Git hooks using the same locked Ruff
```

`make dev_frontend_local` runs Nuxt on the host and loads the root `.env`.
`make format` applies source formatting and automatic lint fixes. `make help`
lists the commands. Checks return a nonzero exit status when they fail.

Backend tests use a unique Compose project, a generated temporary environment
and a disposable database. They do not load the development `.env`, publish
ports, stop development containers or delete development volumes. HTML coverage
is written to `backend/htmlcov`; CI uploads it as an artifact.

## Optional services

```sh
make dev_workers       # core stack plus Redis, Celery worker and scheduler
make dev_tools         # core stack plus Redis, pgAdmin, Flower and mailcatcher
```

Use both profiles together with:

```sh
docker compose --profile workers --profile tools up --build --watch
```

pgAdmin runs on localhost:5050, Flower on localhost:5555 and mailcatcher on
localhost:1080. To use mailcatcher for API emails, set `SMTP_HOST=mailcatcher`,
`SMTP_PORT=1025` and `SMTP_TLS=false` in `.env`, then start the tools profile.
Analytics is disabled by default. Set both `NUXT_UMAMI_ID` and `NUXT_UMAMI_HOST`
and rebuild the frontend to enable your own instance.

`make dev_down` preserves database data. **`make dev_clean` deletes development
database volumes.** PostgreSQL is pinned to major version 17; upgrade existing
volumes using PostgreSQL's migration procedure before changing the major version.

## CI and deployment

The CI workflow checks tooling, Python lint/formatting, backend packaging and
tests, frontend lint/formatting/types/tests/build, and production Docker images.
No deployment account or coverage service is needed for these checks.

Publishing is opt-in: dispatch **Publish container images** from `main` with an
image tag. It checks the selected commit and publishes backend/frontend images
to GHCR with `GITHUB_TOKEN`. The worker uses the same backend image. No Docker Hub
credential, automatic PyPI publication or automatic deployment is configured.

See [backend development](docs/README_backend.md),
[frontend development](frontend/README.md),
[dependency updates](docs/package.json.md) and [deployment](docs/deployment.md).
