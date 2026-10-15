from urllib.parse import urlsplit

from fastapi_myauth.auth import FastAuth
from fastapi_myauth.browser import SocialPopupConfig
from fastapi_myauth.rate_limit import RateLimitConfig, RedisRateLimitBackend
from redis.asyncio import Redis

from app.core.config import settings
from app.core.db import engine

from .config import auth_settings
from .models import auth_components

rate_limit_redis = (
    Redis.from_url(settings.RATE_LIMIT_REDIS_URL)
    if settings.RATE_LIMIT_REDIS_URL
    else None
)
rate_limit_config = RateLimitConfig(enabled=settings.RATE_LIMIT_ENABLED)
if rate_limit_redis is not None:
    rate_limit_config.backend = RedisRateLimitBackend(rate_limit_redis)

frontend = urlsplit(str(auth_settings.FRONTEND_URL))
auth = FastAuth(
    engine=engine,
    components=auth_components,
    rate_limit_config=rate_limit_config,
    social_providers=tuple(
        provider.to_provider() for provider in auth_settings.SOCIAL_PROVIDERS
    ),
    passkey_config=auth_settings.PASSKEY_CONFIG,
    social_popup=SocialPopupConfig(
        target_origin=f"{frontend.scheme}://{frontend.netloc}"
    ),
)
