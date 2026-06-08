from typing import Any

from fastapi import APIRouter

from app.deps import SessionDep

from ...auth.crud import crud_user
from ...auth.models import auth_components

api_router = APIRouter()


@api_router.get(
    "/",
    response_model=list[auth_components.user_read],
)
def read_all_users(
    *,
    db: SessionDep,
    page: int = 0,
) -> Any:
    """
    Retrieve all current users.
    """
    return crud_user.get_multi(db=db, page=page)
