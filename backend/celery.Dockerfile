ARG PYTHON_VERSION=3.13.2 LINUX_VERSION="slim"
FROM python:${PYTHON_VERSION}${LINUX_VERSION:+-$LINUX_VERSION}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV C_FORCE_ROOT=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"
ARG PYTHON_EXTRAS

WORKDIR /app/

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project ${PYTHON_EXTRAS}

ENV PYTHONPATH=/app

COPY ./worker-start.sh /app/

COPY ./pyproject.toml ./uv.lock ./alembic.ini /app/

COPY /app /app/app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync ${PYTHON_EXTRAS}

CMD ["bash", "worker-start.sh"]