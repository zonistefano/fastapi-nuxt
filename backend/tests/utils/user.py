from fastapi.testclient import TestClient
from pydantic import EmailStr
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import User, UserCreate, UserUpdate
from tests.utils.utils import random_email, random_lower_string


def user_authentication_headers(
    *, client: TestClient, email: str, password: str
) -> dict[str, str]:
    data = {"username": email, "password": password}

    r = client.post(f"{settings.API_V1_STR}/login/oauth", data=data)
    response = r.json()
    auth_token = response["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    return headers


def create_user(
    db: Session,
    *,
    email: EmailStr = random_email(),
    password: str | None = random_lower_string(),
    full_name: str | None = random_lower_string(8),
    is_active: bool = True,
    is_superuser: bool = False,
    email_validated: bool = True,
) -> User:
    """
    Create a random user in the database.
    """
    user_in = UserCreate(
        email=email,
        password=password,
        full_name=full_name,
        is_active=is_active,
        is_superuser=is_superuser,
        email_validated=email_validated,
    )
    user = crud.user.create(db=db, obj_in=user_in)
    return user


def authentication_token_from_email(
    *,
    client: TestClient,
    db: Session,
    email: str,
    password: str = "changeme",
    is_superuser: bool = False,
) -> dict[str, str]:
    """
    Return a valid token for the user with given email. Password is set to
    'changeme' by default. If the user exists, it is updated with the new
    password. If the user doesn't exist it is created first.

    If the user doesn't exist it is created first.
    """
    user = crud.user.get_by_email(db=db, email=email)
    if not user:
        user_in_create = UserCreate(
            email=email, password=password, is_superuser=is_superuser
        )
        user = crud.user.create(db=db, obj_in=user_in_create)
    else:
        user_in_update = UserUpdate(password=password, is_superuser=is_superuser)
        if not user.id:
            raise Exception("User id not set")
        user = crud.user.update(db=db, db_obj=user, obj_in=user_in_update)

    return user_authentication_headers(client=client, email=email, password=password)
