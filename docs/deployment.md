# Deployment

The supported default deployment artifact is a pair of production container
images. Publishing and hosting are separate operations. Nothing is deployed
on a push to the template or a generated project.

## Publish images

Dispatch **Publish container images** from the Actions tab on `main`, providing
a container tag such as `1.0.0`. The workflow checks the selected commit and
publishes:

- `ghcr.io/owner/repository/backend:1.0.0`
- `ghcr.io/owner/repository/frontend:1.0.0`

It authenticates with `GITHUB_TOKEN`. Ensure GitHub Actions has permission to
publish packages in your organization. Package visibility is controlled in GHCR.
The Celery worker and scheduler use the backend image.

## Run production containers

Copy `docker-compose.yml` and `.env.example` onto the hosting machine and run
the bootstrap script to create an untracked `.env`, or supply an equivalent
configuration from your secret manager. All API replicas must share persistent
`SECRET_KEY` and `TOTP_SECRET_KEY` values.

Set `IMAGE_PREFIX=ghcr.io/owner/repository`, `TAG=1.0.0`, your public frontend/API
URLs, email settings and CORS origins. Configure analytics at build time only
if wanted. Then run:

```sh
docker compose --env-file .env -f docker-compose.yml pull
docker compose --env-file .env -f docker-compose.yml up -d --no-build
```

The explicit `-f` selects the production file without development overrides.
Attach your TLS reverse proxy to the Compose network and route traffic to
`frontend:3000` and `backend:8000`. The production Compose file does not publish
database, administration or application ports directly to the host.

Enable `--profile workers` for background jobs. Keep the `tools` profile for
administration environments with an appropriate access boundary. PostgreSQL
is pinned to major version 17; a major version change requires a database
migration rather than simply replacing the image tag. Back up database data
and persistent encryption keys before upgrades.

Static hosting on GitHub Pages or Cloudflare requires a project-specific Nuxt
preset and authentication/API configuration. Add a dedicated deployment workflow
only after validating that target. The template no longer includes dormant
provider workflows or automatic publication of a generic `app` package to PyPI.
