PROJECT_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND_DIR := $(PROJECT_ROOT)/backend
FRONTEND_DIR := $(PROJECT_ROOT)/frontend
UV := uv
BUN := bun
PYTHON := python3
export MESSAGE
PYTHON_VERSION := $(shell cat "$(PROJECT_ROOT)/.python-version")
BACKEND_INSTALL_CMD := $(UV) sync --locked --python $(PYTHON_VERSION)
FRONTEND_INSTALL_CMD := $(BUN) install --frozen-lockfile
FRONTEND_LINT_CMD := $(BUN) run lint
FRONTEND_TEST_CMD := $(BUN) run test
DOCKER_COMPOSE_PROD := docker compose --env-file "$(PROJECT_ROOT)/.env" -f "$(PROJECT_ROOT)/docker-compose.yml"
DOCKER_COMPOSE_DEV := $(DOCKER_COMPOSE_PROD) -f "$(PROJECT_ROOT)/docker-compose.override.yml"

.DEFAULT_GOAL := help
.PHONY: help init setup backend_setup frontend_setup backend_upgrade frontend_upgrade \
	check tooling_check lint lint_backend lint_frontend format_check typecheck \
	test test_backend test_frontend pre_commit_install pre_commit_check \
	format format_backend format_frontend build build_backend build_frontend \
	dev dev_backend dev_frontend dev_frontend_local dev_db_only dev_db_up \
	dev_down dev_logs dev_clean prod_up prod_down dev_workers dev_tools \
	docker_exec_backend docker_exec_frontend backend_makemigrations \
	clean clean_backend clean_frontend

help: ## List available commands.
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-25s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## Generate missing configuration and persistent secrets; preserve existing values.
	@$(PYTHON) "$(PROJECT_ROOT)/scripts/init.py"

setup: backend_setup frontend_setup ## Initialize configuration and install locked dependencies.

backend_setup: init ## Install locked backend dependencies.
	@cd "$(BACKEND_DIR)" && $(BACKEND_INSTALL_CMD)

frontend_setup: init ## Install locked frontend dependencies and prepare Nuxt.
	@cd "$(FRONTEND_DIR)" && $(FRONTEND_INSTALL_CMD)

backend_upgrade: ## Explicitly update Python dependencies and the lockfile.
	@cd "$(BACKEND_DIR)" && $(UV) lock --upgrade
	@cd "$(BACKEND_DIR)" && $(UV) sync --locked

frontend_upgrade: ## Explicitly update frontend dependencies and the lockfile.
	@cd "$(FRONTEND_DIR)" && $(BUN) update

check: tooling_check lint format_check typecheck ## Run all checks without rewriting source files.

tooling_check: ## Test bootstrap, error propagation, and test-stack isolation.
	@cd "$(PROJECT_ROOT)" && $(PYTHON) -m unittest discover -s tests -v

lint: lint_backend lint_frontend ## Check Python and frontend source.

lint_backend: ## Run the locked version of Ruff.
	@cd "$(BACKEND_DIR)" && $(UV) run --locked ruff check --config pyproject.toml . ../scripts ../tests

lint_frontend: ## Run ESLint.
	@cd "$(FRONTEND_DIR)" && $(FRONTEND_LINT_CMD)

format_check: ## Check formatting without changing files.
	@cd "$(BACKEND_DIR)" && $(UV) run --locked ruff format --check --config pyproject.toml . ../scripts ../tests
	@cd "$(FRONTEND_DIR)" && $(BUN) run format:check

typecheck: ## Check Nuxt and Vue types.
	@cd "$(FRONTEND_DIR)" && $(BUN) run typecheck

test: test_backend test_frontend ## Run isolated backend tests and frontend unit tests.

test_backend: ## Run backend tests in a disposable Compose project.
	@cd "$(PROJECT_ROOT)" && bash scripts/test.sh

test_frontend: ## Run frontend unit tests with Bun.
	@cd "$(FRONTEND_DIR)" && $(FRONTEND_TEST_CMD)

pre_commit_install: ## Install optional Git hooks after setup.
	@cd "$(PROJECT_ROOT)" && $(UV) run --project backend --locked pre-commit install

pre_commit_check: ## Run the optional hooks against all tracked files.
	@cd "$(PROJECT_ROOT)" && $(UV) run --project backend --locked pre-commit run --all-files

format: format_backend format_frontend ## Format and apply automatic lint fixes.

format_backend: ## Format Python source with the locked version of Ruff.
	@cd "$(BACKEND_DIR)" && $(UV) run --locked ruff check --config pyproject.toml . ../scripts ../tests --fix
	@cd "$(BACKEND_DIR)" && $(UV) run --locked ruff format --config pyproject.toml . ../scripts ../tests

format_frontend: ## Format frontend source and apply ESLint fixes.
	@cd "$(FRONTEND_DIR)" && $(BUN) run lint:fix
	@cd "$(FRONTEND_DIR)" && $(BUN) run format

build: build_backend build_frontend ## Build production images.

build_backend: init ## Build the production backend image.
	$(DOCKER_COMPOSE_PROD) build backend

build_frontend: init ## Build the production frontend image.
	$(DOCKER_COMPOSE_PROD) build frontend

dev: init ## Start the core stack with reload and Compose Watch.
	$(DOCKER_COMPOSE_DEV) up --build --watch

dev_backend: init ## Start backend, migrations, and database with reload.
	$(DOCKER_COMPOSE_DEV) up --build --watch backend

dev_frontend: init ## Start the containerized frontend with dependency updates.
	$(DOCKER_COMPOSE_DEV) up --build --watch frontend

dev_frontend_local: frontend_setup ## Run Nuxt on the host using the project environment.
	@cd "$(FRONTEND_DIR)" && $(BUN) run dev --dotenv ../.env

dev_db_only: init ## Start the development database.
	$(DOCKER_COMPOSE_DEV) up --wait db

dev_db_up: dev_db_only ## Apply development migrations and create the initial user.
	$(DOCKER_COMPOSE_DEV) run --build --rm prestart

dev_workers: init ## Start the core stack, Celery worker, and scheduler.
	$(DOCKER_COMPOSE_DEV) --profile workers up --build --watch

dev_tools: init ## Start the core stack with pgAdmin, Flower, and mailcatcher.
	$(DOCKER_COMPOSE_DEV) --profile tools up --build --watch

dev_down: init ## Stop development services while preserving data.
	$(DOCKER_COMPOSE_DEV) --profile '*' down --remove-orphans

dev_logs: init ## Follow development logs.
	$(DOCKER_COMPOSE_DEV) --profile '*' logs -f

dev_clean: init ## Explicitly reset development services and DELETE their database volumes.
	$(DOCKER_COMPOSE_DEV) --profile '*' down --remove-orphans --volumes

prod_up: init ## Start the production stack; see docs/deployment.md for hosting.
	$(DOCKER_COMPOSE_PROD) up --build -d

prod_down: init ## Stop production services while preserving data.
	$(DOCKER_COMPOSE_PROD) --profile '*' down --remove-orphans

docker_exec_backend: init ## Execute CMD in the development backend.
	$(DOCKER_COMPOSE_DEV) exec backend $(CMD)

docker_exec_frontend: init ## Execute CMD in the development frontend.
	$(DOCKER_COMPOSE_DEV) exec frontend $(CMD)

backend_makemigrations: dev_db_only ## Create a migration; pass MESSAGE="description".
	@test -n "$$MESSAGE" || { echo 'Pass MESSAGE="migration description"' >&2; exit 1; }
	$(DOCKER_COMPOSE_DEV) run --build --rm --no-deps backend bash -c 'alembic upgrade head && alembic revision --autogenerate -m "$$1"' -- "$$MESSAGE"

clean: clean_backend clean_frontend ## Remove local dependencies and generated files; preserve databases.

clean_backend: ## Remove the local Python environment and caches.
	@rm -rf $(BACKEND_DIR)/.venv $(BACKEND_DIR)/.ruff_cache $(BACKEND_DIR)/.pytest_cache

clean_frontend: ## Remove local frontend dependencies and build output.
	@rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/.nuxt $(FRONTEND_DIR)/.output
