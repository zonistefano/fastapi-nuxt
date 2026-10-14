# Contributing

Run `make setup`, `make check`, `make test` and `make build` before submitting
changes. Keep manifests, lockfiles, tool versions and documentation consistent.
Use `make format` for automatic formatting. Git hooks are optional and use the
same locked Ruff version as CI.

Template changes must work in a clean generated project with no deployment
credentials. Use `.env.example` for settings and keep generated secrets out of
Git. Tests must use the disposable test stack, never development volumes.

Describe the resulting behavior and the checks performed in pull requests.
Configure reviewers, release policy and private security contacts separately
for each project derived from this template.
