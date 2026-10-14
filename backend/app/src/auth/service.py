from fastapi_myauth.auth import FastAuth
from fastapi_myauth.rate_limit import RateLimitConfig, RedisRateLimitBackend
from redis.asyncio import Redis

from app.core.config import settings
from app.core.db import engine

from .models import auth_components

rate_limit_redis = (
    Redis.from_url(settings.RATE_LIMIT_REDIS_URL)
    if settings.RATE_LIMIT_REDIS_URL
    else None
)
rate_limit_config = RateLimitConfig(enabled=settings.RATE_LIMIT_ENABLED)
if rate_limit_redis is not None:
    rate_limit_config.backend = RedisRateLimitBackend(rate_limit_redis)

auth = FastAuth(
    engine=engine,
    components=auth_components,
    rate_limit_config=rate_limit_config,
)
