from fastapi import APIRouter

from ..service import auth
from .endpoints import services, users

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auth.get_router(include_disabled_methods=True))
api_router.include_router(services.router, prefix="/services", tags=["services"])
