from fastapi import APIRouter

from .src.auth.api.api import api_router as auth_api_router
from .src.bpmn.api.api import api_router as bpmn_api_router
from .src.chat.api.api import api_router as chat_api_router
from .src.editor.api.api import api_router as editor_api_router

api_router = APIRouter()

api_router.include_router(auth_api_router)
api_router.include_router(bpmn_api_router)
api_router.include_router(chat_api_router)
api_router.include_router(editor_api_router)
