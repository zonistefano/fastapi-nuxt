from fastapi_myauth.auth import FastAuth

from ..models import auth_components
from .db import engine

auth = FastAuth(engine=engine, components=auth_components)

auth_router = auth.get_router()
