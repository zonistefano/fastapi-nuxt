from ..service import auth
from .endpoints import services

api_router = auth.get_router()

api_router.include_router(services.router, prefix="/services", tags=["services"])
