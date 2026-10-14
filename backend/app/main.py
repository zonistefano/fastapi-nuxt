from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi_myauth.rate_limit import RateLimitMiddleware, rate_limit
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.logging_conf import configure_logging
from app.src.auth.service import auth, rate_limit_redis

from .router import api_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    try:
        yield
    finally:
        if rate_limit_redis is not None:
            await rate_limit_redis.aclose()


def operation_id(route: APIRoute) -> str:
    """Keep generated SDK names independent of URL formatting."""
    tag = route.tags[0] if route.tags else "api"
    return f"{tag}_{route.name}"


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
        docs_url="/docs" if settings.ENABLE_DOCS else None,
        redoc_url="/redoc" if settings.ENABLE_DOCS else None,
        lifespan=lifespan,
        generate_unique_id_function=operation_id,
    )
    application.add_middleware(RateLimitMiddleware, limiter=auth.rate_limiter)
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=settings.BACKEND_CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["Retry-After"],
        )
    application.include_router(api_router)

    @application.get("/health-check/", tags=["health"])
    @rate_limit(exempt=True)
    async def health_check() -> int:
        """Liveness probe; database readiness is checked by the prestart service."""
        return 1

    return application


configure_logging()
app = create_app()
