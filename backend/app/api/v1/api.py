from fastapi import APIRouter

from .endpoints import chats, services

api_router = APIRouter()
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
