# Dependency updates

The frontend uses Bun and `frontend/bun.lock`; the backend uses uv and
`backend/uv.lock`. Install with `make setup`, which checks the lockfiles instead
of silently changing dependency versions.

Explicitly update dependencies with:

```sh
make frontend_upgrade
make backend_upgrade
make check
make test
make build
```

For a selected frontend dependency, run `bun add package@version` from
`frontend/`; use `bun add --dev package@version` for development tools. For a
selected Python dependency, run `uv add package==version` from `backend/`.
Commit each manifest and its updated lockfile together.

Ruff and pre-commit are pinned in `backend/pyproject.toml`. Git hooks use the
backend's locked Ruff rather than a second independently pinned installation.
Update tool version files, Dockerfile defaults and `packageManager` together
when changing the toolchain. CI reads the version files.

Dependabot checks GitHub Actions, uv in `/backend`, Bun in `/frontend` and
Dockerfiles weekly. Application dependency updates are grouped by ecosystem.
