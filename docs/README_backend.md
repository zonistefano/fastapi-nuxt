# Backend development

Run commands from the repository root. The backend uses Python from
`.python-version`, uv from `.uv-version`, and `backend/uv.lock`.

```sh
make backend_setup
make lint_backend
make test_backend
make build_backend
```

Tests use their own temporary environment and disposable PostgreSQL container.
`backend/htmlcov/index.html` contains the coverage report. Do not run integration
tests directly against the development database.

Start the database and apply migrations with `make dev_db_up`. To launch the API
on the host, use:

```sh
POSTGRES_SERVER=localhost uv run --project backend --locked --env-file .env \
  fastapi dev backend/app/main.py
```

The VS Code debug configuration uses the same backend working directory and
sets the database host to localhost. Start the database before debugging.

## Migrations

```sh
make backend_makemigrations MESSAGE="add profile fields"
make dev_db_up
```

Review the migration generated in `backend/alembic/versions` before committing.
Migration generation uses command arguments instead of interpolating the message
into a shell program. Apply migrations before starting code that needs them.

## Persistent authentication keys

`make init` generates `SECRET_KEY` and `TOTP_SECRET_KEY` once. Every worker and
replica must use the same configured keys. Missing or invalid keys prevent
startup. Keep them across restarts and deployments; changing the encryption key
requires an explicit migration of persisted TOTP secrets.

## Background tasks

`make dev_workers` enables Redis, the Celery worker and a separate RedBeat
scheduler. Source changes restart the worker and scheduler through Compose
Watch; dependency changes rebuild their development image. Production services
reuse the backend production image, which excludes development dependencies.

Python build artifacts can be checked with `uv build backend --out-dir dist`.
If you choose to distribute a Python package, set your own package metadata and
configure a separate publishing workflow. This template does not publish to PyPI.
