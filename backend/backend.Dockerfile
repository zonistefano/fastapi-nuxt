ARG PYTHON_VERSION=3.13.2
ARG UV_VERSION=0.13.1
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv
FROM python:${PYTHON_VERSION}-slim AS base
COPY --from=uv /uv /uvx /bin/
ENV PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH" PYTHONPATH=/app
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

FROM dependencies AS development
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked
CMD ["fastapi", "run", "--reload", "app/main.py"]

FROM dependencies AS production
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini prestart.sh worker-start.sh ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable
RUN useradd --create-home app && chown -R app:app /app
USER app
CMD ["fastapi", "run", "--workers", "1", "app/main.py"]
