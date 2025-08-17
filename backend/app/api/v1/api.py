from fastapi import APIRouter

from .endpoints import services

api_router = APIRouter()
api_router.include_router(services.router, prefix="/services", tags=["services"])
