from fastapi_myauth.auth import FastAuth

from app.core.db import engine

from .models import auth_components

auth = FastAuth(
    engine=engine,
    components=auth_components,
)
