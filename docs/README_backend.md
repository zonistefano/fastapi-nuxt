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

## Authentication 1.6

The backend pins `fastapi-myauth==1.6.0`, FastAPI `0.143.*` and SQLModel
`0.0.48`. `AuthSettings` extends the library settings and loads their fields
from the environment, including `USERS_OPEN_REGISTRATION`, `SMTP_SSL`,
`SESSION_MAX_LIFETIME_SECONDS`, `RECENT_AUTH_EXPIRE_SECONDS` and
`MAX_REFRESH_SESSIONS_PER_USER`. Email helpers use the HTML templates packaged
with the library; override `EMAIL_TEMPLATES_DIR` only for your own templates.

For an existing database, back it up and apply `alembic upgrade head` before
starting the new backend. The added revision preserves users, password hashes,
TOTP secrets, passkeys and social identities. It replaces legacy raw refresh
storage with hashes, adds session/challenge/recovery fields and converts legacy
PostgreSQL timestamps from UTC into timezone-aware timestamps. Existing tokens
and pending email/passkey flows require a new login/request. Legacy social
identities attached to unverified emails require explicit relinking. Downgrading
restores the previous schema but does not restore invalidated sessions.

The signing and TOTP keys must remain unchanged during this upgrade. If legacy
timestamps were written using a different convention than UTC, review the
migration's explicit UTC conversion before applying it.

Protected application routes should use `SessionDep` from `app.deps` together
with `Depends(CurrentUser)` or `Depends(RequireRole(["admin"]))` from
`app.src.auth.api.deps`. Application and authentication code then share the
same transaction. `CRUDBase` participates in this unit of work; for standalone
multi-operation services, wrap the session with
`fastapi_myauth.transactions.transaction`. Operations commit before returning
successful HTTP responses, and exceptions roll back the entire operation.

Rate limiting is enabled by default, including stricter limits for authentication
and five contact submissions per hour per client IP. Health probes are exempt.
The production image starts one API worker so the default in-memory counters
apply consistently. Before increasing workers or adding replicas, configure
`RATE_LIMIT_REDIS_URL` with a shared Redis instance, or enforce appropriate
limits at your gateway. For the optional Compose Redis service, use
`redis://queue:6379/2` and enable the `workers` or `tools` profile. Configure
Uvicorn's trusted proxy addresses when deploying behind a reverse proxy; use
trusted addresses instead of trusting arbitrary forwarded headers.

With the `workers` profile, Celery Beat runs expired authentication record
cleanup every hour. Without workers, schedule the same cleanup externally:

```sh
uv run --project backend --locked --env-file .env python -m app.maintenance
```

SMTP is required for magic links, account confirmation, password recovery and
contact email. With the default empty SMTP configuration, use password login;
contact submissions return 503. For local email demonstrations, enable
mailcatcher as described in the root README. `SMTP_TLS` enables STARTTLS;
`SMTP_SSL` enables implicit TLS. Leave both false for mailcatcher.

The included Nuxt client saves replacement tokens after TOTP enrollment or
disable, displays recovery codes once, and returns to login after changing
password/email. Sensitive operations require authentication within the configured
recent-auth window. The backend provides `/login/reauth` and TOTP recovery
endpoints; the showcase UI does not yet include forms for those operations.
Social login and passkeys are optional extensions: install the corresponding
`fastapi-myauth` extras and configure providers/relying-party settings in
`app/src/auth/service.py` when a project needs them.

`chat`, `editor` and `bpmn` backend modules are extension points. They do not
implement chat, document persistence or BPMN workflow execution. User
administration is provided exclusively by the protected `/users/` routes.

## Fast local regression checks

```sh
uv run --project backend --locked pytest backend/tests
```

Direct pytest execution uses temporary SQLite databases and test settings.
`make test_backend` remains the integration check: it builds the development
image, applies migrations to disposable PostgreSQL, and runs the same tests.
Tests verify a fresh schema and an upgrade with existing users. Schema
comparison catches differences between migrations and the installed auth models.
Neither command needs the development database. PostgreSQL mode is selected by
the isolated test Compose configuration using `TEMPLATE_TEST_POSTGRES=1`.

See [the backend review](backend-review.md) for findings, changes and verification
limits.
