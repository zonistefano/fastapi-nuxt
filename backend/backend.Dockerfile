ARG PYTHON_VERSION=3.13.2 LINUX_VERSION="slim"
FROM python:${PYTHON_VERSION}${LINUX_VERSION:+-$LINUX_VERSION}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app/

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

ENV PYTHONPATH=/app

COPY ./prestart.sh /app/

COPY ./pyproject.toml ./uv.lock ./alembic.ini /app/

COPY /app /app/app
COPY /alembic /app/alembic
COPY /tests /app/tests
COPY /scripts /app/scripts

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

ARG INSTALL_JUPYTER=false

RUN bash -c "if [ $INSTALL_JUPYTER == 'true' ] ; then \
    apt-get update \
    && apt-get install -y gcc python3-dev \
    && pip install jupyterlab ; \
    fi"

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
