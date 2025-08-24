# Define main project root (where this Makefile resides)
PROJECT_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
DOTENV_FILE := $(PROJECT_ROOT)/.env

# --- Project Paths ---
BACKEND_DIR := $(PROJECT_ROOT)/backend
FRONTEND_DIR := $(PROJECT_ROOT)/frontend
DOCKER_COMPOSE_PROD_FILE := $(PROJECT_ROOT)/docker-compose.yml
DOCKER_COMPOSE_DEV_FILE := $(PROJECT_ROOT)/docker-compose.override.yml # Used for development overrides

# --- Commands ---
# Backend
BACKEND_INSTALL_CMD := uv sync
BACKEND_TEST_SCRIPT := /app/scripts/test.sh # Path inside the Docker container

# Frontend
FRONTEND_INSTALL_CMD := bun install
FRONTEND_DEV_CMD := bun run dev
FRONTEND_BUILD_CMD := bun run build
FRONTEND_LINT_CMD := bun run lint
FRONTEND_TEST_CMD := bun run test
FRONTEND_FORMAT_CMD := bun run format
FRONTEND_LINT_FIX_CMD := bun run lint:fix

# Docker Compose Setup
# Use the override file for development specific configurations
DOCKER_COMPOSE_DEV := docker compose -f $(DOCKER_COMPOSE_PROD_FILE) -f $(DOCKER_COMPOSE_DEV_FILE)
DOCKER_COMPOSE_PROD := docker compose -f $(DOCKER_COMPOSE_PROD_FILE)

# --- Variables ---
# Docker service names (adjust as per your docker-compose.yml services)
BACKEND_SERVICE_NAME := backend
FRONTEND_SERVICE_NAME := frontend
CELERY_SERVICE_NAME := celeryworker
DB_SERVICE_NAME := db
PRESTART_SERVICE_NAME := prestart

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: all help dev prod setup clean test lint docker format

# ==============================================================================
# 0. General / Help
# ==============================================================================

all: help ## Show all available commands.

help:
	@echo ""
	@echo "================================================================================"
	@echo "$(GREEN)						Makefile Help Menu$(NC)"
	@echo "================================================================================"
	@echo "$(YELLOW)General Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "================================================================================"

# ==============================================================================
# 1. Setup and Environment
# ==============================================================================

setup: backend_setup frontend_setup ## Set up both backend and frontend environments.

backend_setup: ## Install backend dependencies using uv.
	@echo "$(YELLOW)==> Installing backend dependencies with uv...$(NC)"
	@cd ${BACKEND_DIR} && $(BACKEND_INSTALL_CMD)
	@echo "$(GREEN)==> Backend setup complete.$(NC)"

frontend_setup: ## Install frontend dependencies using bun.
	@echo "$(YELLOW)==> Installing frontend dependencies with bun...$(NC)"
	@cd $(FRONTEND_DIR) && $(FRONTEND_INSTALL_CMD)
	@echo "$(GREEN)Frontend dependencies installed.$(NC)"

backend_upgrade: ## Upgrade backend dependencies using uv.
	@echo "$(YELLOW)==> Upgrading backend dependencies with uv...$(NC)"
	@cd ${BACKEND_DIR} && $(BACKEND_INSTALL_CMD) --upgrade
	@echo "$(GREEN)==> Backend upgrade complete.$(NC)"

clean: clean_backend clean_frontend ## Clean all generated files and caches.
	@echo "$(GREEN)==> All clean.$(NC)"

clean_backend: ## Clean backend environment (remove virtual environment, caches, etc.).
	@echo "$(YELLOW)==> Cleaning backend...$(NC)"
	@rm -rf $(BACKEND_DIR)/.venv $(BACKEND_DIR)/__pycache__ $(BACKEND_DIR)/*/__pycache__ $(BACKEND_DIR)/*/*/__pycache__
	@echo "$(GREEN)Backend cleaned.$(NC)"

clean_frontend: ## Clean frontend environment (remove node_modules, caches, etc.).
	@echo "$(YELLOW)==> Cleaning frontend...$(NC)"
	@rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/.nuxt $(FRONTEND_DIR)/.output
	@echo "$(GREEN)Frontend cleaned.$(NC)"

# ==============================================================================
# 2. Local Development
# ==============================================================================

dev: setup ## Start all services for development (backend, frontend, db, celery).
	@echo "$(YELLOW)==> Starting all development Docker services...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build --watch
	@echo "$(GREEN)Development Docker services are up and running.$(NC)"

dev_backend: dev_db_up ## Start only backend and database for development.
	@echo "$(YELLOW)==> Starting backend and database for development...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build -d $(DB_SERVICE_NAME) $(BACKEND_SERVICE_NAME)
	@echo "$(GREEN)Backend and database services are up.$(NC)"

dev_frontend: ## Start only frontend for development.
	@echo "$(YELLOW)==> Starting frontend and database for development...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build -d $(FRONTEND_SERVICE_NAME)
	@echo "$(GREEN)Frontend service is up.$(NC)"

dev_frontend_local: ## Run the Nuxt frontend locally in development mode (outside Docker).
	@echo "$(YELLOW)==> Running Nuxt frontend locally (outside Docker)...$(NC)"
	@cd $(FRONTEND_DIR) && $(FRONTEND_DEV_CMD)

dev_db_up: ## Start only the database service and run prestart script (migrations, data init) for development.
	@echo "$(YELLOW)==> Starting database service and running prestart script...$(NC)"
	$(DOCKER_COMPOSE_DEV) up -d $(DB_SERVICE_NAME)
	$(DOCKER_COMPOSE_DEV) run --build --rm $(PRESTART_SERVICE_NAME)
	@echo "$(GREEN)Database service is up and prestart script has completed.$(NC)"

dev_down: ## Stop and remove all development Docker Compose services.
	@echo "$(YELLOW)==> Stopping and removing all development Docker services...$(NC)"
	$(DOCKER_COMPOSE_DEV) down --remove-orphans
	@echo "$(GREEN)Development Docker services are stopped and removed.$(NC)"

dev_logs: ## View logs for all running development Docker services.
	@echo "$(YELLOW)==> Displaying Docker Compose development logs (Ctrl+C to exit)...$(NC)"
	$(DOCKER_COMPOSE_DEV) logs -f

dev_clean: ## Stop and remove all Docker Compose services, then remove volumes.
	@echo "$(YELLOW)==> Cleaning up Docker services and resources...$(NC)"
	$(DOCKER_COMPOSE_DEV) down --remove-orphans -v
	@echo "$(GREEN)Docker services cleaned.$(NC)"

# ==============================================================================
# 3. Docker Operations
# ==============================================================================

prod_up: ## Start all services for production/staging (using main docker-compose.yml).
	@echo "$(YELLOW)==> Starting all production/staging Docker services...$(NC)"
	$(DOCKER_COMPOSE_PROD) up --build -d
	@echo "$(GREEN)Production/staging Docker services are up and running.$(NC)"

prod_down: ## Stop and remove all production/staging Docker Compose services.
	@echo "$(YELLOW)==> Stopping and removing all production/staging Docker services...$(NC)"
	$(DOCKER_COMPOSE_PROD) down --remove-orphans
	@echo "$(GREEN)Production/staging Docker services are stopped and removed.$(NC)"

docker_prune: ## Remove all unused Docker networks, anonymous volumes, and *images*. WARNING: Global action.
	@echo "$(RED)WARNING: This will remove ALL unused Docker networks, anonymous volumes, and images on your system. Continue? (y/N)$(NC)"
	@read -r ans; \
	if [ "$$ans" = "y" ]; then \
		echo "$(YELLOW)==> Pruning unused Docker images...$(NC)"; \
		docker image prune -a -f; \
		echo "$(YELLOW)==> Pruning unused Docker networks...$(NC)"; \
		docker network prune -f; \
		echo "$(YELLOW)==> Pruning unused Docker volumes...$(NC)"; \
		docker volume prune -f; \
		echo "$(GREEN)Docker resources purged.$(NC)"; \
	else \
		echo "$(YELLOW)Operation cancelled.$(NC)"; \
	fi

docker_exec_backend: ## Execute a command inside the backend container (dev context). Usage: make docker_exec_backend CMD="bash"
	@echo "$(YELLOW)==> Executing command in backend container: $(CMD)...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec $(BACKEND_SERVICE_NAME) $(CMD)

docker_exec_frontend: ## Execute a command inside the frontend container (dev context). Usage: make docker_exec_frontend CMD="bash"
	@echo "$(YELLOW)==> Executing command in frontend container: $(CMD)...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec $(FRONTEND_SERVICE_NAME) $(CMD)

# ==============================================================================
# 4. Testing
# ==============================================================================

test: test_backend test_frontend ## Run all (backend and frontend) tests.

test_backend: ## Run backend tests inside the Docker container.
	@echo "$(YELLOW)==> Running backend tests inside Docker container...$(NC)"
	$(DOCKER_COMPOSE_DEV) run --rm $(BACKEND_SERVICE_NAME) sh -c "$(BACKEND_TEST_SCRIPT)"
	@echo "$(GREEN)Backend tests completed in container.$(NC)"

test_frontend: ## Run frontend tests.
	@echo "$(YELLOW)==> Running frontend tests locally...$(NC)"
	@cd $(FRONTEND_DIR) && $(FRONTEND_TEST_CMD) # Assuming bun run test is configured for your tests
	@echo "$(GREEN)Frontend tests completed locally.$(NC)"

# ==============================================================================
# 5. Linting / Code Quality
# ==============================================================================

lint: lint_backend lint_frontend ## Run all (backend and frontend) linters.

lint_backend: ## Run backend linting (pre-commit, black, ruff, etc.) on local files.
	@echo "$(YELLOW)==> Running backend linting locally (pre-commit)...$(NC)"
	# Pre-commit hooks will handle most of this.
	@uv -m pre_commit run --all-files
	@echo "$(GREEN)Backend linting completed locally.$(NC)"

pre_commit_install:
	@echo "$(YELLOW)==> Installing pre-commit hooks...$(NC)"
	uv -m pre_commit install
	uv -m pre_commit install --hook-type commit-msg
	@echo "$(GREEN)Pre-commit hooks installed.$(NC)"

lint_frontend: ## Run frontend linting (ESLint, Prettier).
	@echo "$(YELLOW)==> Running frontend linting...$(NC)"
	@cd $(FRONTEND_DIR) && $(FRONTEND_LINT_CMD)
	@echo "$(GREEN)Frontend linting completed.$(NC)"

# ==============================================================================
# 6. Build / Distribution
# ==============================================================================

build: build_backend build_frontend ## Build both backend and frontend for production/deployment.

build_backend: ## Build the backend Docker image for production.
	@echo "$(YELLOW)==> Building backend Docker image for production...$(NC)"
	$(DOCKER_COMPOSE_PROD) build $(BACKEND_SERVICE_NAME)
	@echo "$(GREEN)Backend Docker image built for production.$(NC)"

build_frontend: ## Build the frontend Docker image for production.
	@echo "$(YELLOW)==> Building frontend Docker image for production...$(NC)"
	$(DOCKER_COMPOSE_PROD) build $(FRONTEND_SERVICE_NAME)
	@echo "$(GREEN)Frontend Docker image built for production.$(NC)"

# ==============================================================================
# 7. Utilities
# ==============================================================================

format: format_backend format_frontend ## Auto-format code for both backend and frontend.

format_backend:
	@echo "$(YELLOW)==> Auto-formatting backend code locally (using ruff)...$(NC)"
	@cd ${BACKEND_DIR} && uv run ruff format $(BACKEND_DIR)
	@cd ${BACKEND_DIR} && uv run ruff check $(BACKEND_DIR) --fix
	@echo "$(GREEN)Backend code formatted locally.$(NC)"

format_frontend:
	@echo "$(YELLOW)==> Auto-formatting frontend code (using prettier and eslint --fix)...$(NC)"
	@cd $(FRONTEND_DIR) && $(FRONTEND_FORMAT_CMD)
	@cd $(FRONTEND_DIR) && $(FRONTEND_LINT_FIX_CMD)
	@echo "$(GREEN)Frontend code formatted.$(NC)"

backend_makemigrations: dev_db_up ## Create new Alembic migration inside a temporary backend container.
	@echo "$(YELLOW)==> Creating new Alembic migration inside a temporary docker container. Describe it:$(NC)"
	@read -p 'Migration message: ' user_msg; \
		if [ -z "$$user_msg" ]; then \
			echo "$(RED)Error: Migration message cannot be empty. Aborting.$(NC)"; \
			exit 1; \
		fi; \
		$(DOCKER_COMPOSE_DEV) run --rm -w /app $(BACKEND_SERVICE_NAME) sh -c "alembic revision --autogen -m \"$$user_msg\""
	@echo "$(GREEN)Alembic migration created in container. Please review the generated script.$(NC)"

.ONESHELL: # Allows multi-line commands in a single shell for targets.