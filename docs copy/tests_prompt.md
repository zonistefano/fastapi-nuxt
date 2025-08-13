Write comprehensive tests for the following FastApi route. It uses Fastapi, SqlModel and pytest.  
 
Segment the tests by api route using.

```
# ===========================
# 1. Signup Endpoint (/login/signup)
# ===========================
```

The following fixtures have been set.

```python
@pytest.fixture()
def db() -> Generator[Session]:
    with Session(engine) as session:
        init_db(session)
        yield session
        statement = delete(RefreshToken)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def superuser_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, db=db, email=settings.EMAIL_TEST_USER, is_superuser=True
    )


@pytest.fixture()
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, db=db, email=settings.EMAIL_TEST_USER
    )
```

tests/utils/users.py

```python
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
        user_in_create = UserCreate(email=email, password=password)
        user = crud.user.create(db=db, obj_in=user_in_create)
    else:
        user_in_update = UserUpdate(password=password, is_superuser=is_superuser)
        if not user.id:
            raise Exception("User id not set")
        user = crud.user.update(db=db, db_obj=user, obj_in=user_in_update)

    return user_authentication_headers(client=client, email=email, password=password)
```

tests/utils/utils.py

```python
import random
import string


def random_lower_string(lenght=32) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=lenght))


def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"

```

api route:

```python
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app import crud, models
from app.api import deps
from app.core.config import settings
from app.utilities import (
    send_new_account_email,
)

router = APIRouter()


@router.put("/me", response_model=models.UserRead)
def update_user_me(
    *,
    db: deps.SessionDep,
    obj_in: models.UserUpdate,
    current_user: deps.CurrentActiveUser,
) -> Any:
    """
    Update user.
    """
    if current_user.hashed_password:
        user = crud.user.authenticate(
            db, email=current_user.email, password=obj_in.original
        )
        if not obj_in.original or not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to authenticate this update.",
            )
    user_in = models.UserUpdate.model_validate(current_user)
    if obj_in.password is not None:
        user_in.password = obj_in.password
    if obj_in.full_name is not None:
        user_in.full_name = obj_in.full_name
    if obj_in.email is not None:
        check_user = crud.user.get_by_email(db, email=obj_in.email)
        if check_user and check_user.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is not available.",
            )
        user_in.email = obj_in.email
    user = crud.user.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.get("/me", response_model=models.UserRead)
def read_user_me(
    *,
    current_user: deps.CurrentActiveUser,
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=models.Msg)
def delete_user_me(
    db: deps.SessionDep,
    current_user: deps.CurrentActiveUser,
) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super users are not allowed to delete themselves",
        )
    crud.user.remove(db, id=current_user.id)
    return models.Msg(msg="User deleted successfully")


@router.get(
    "/{user_id}",
    response_model=models.UserRead,
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def read_user_by_id(user_id: UUID, db: deps.SessionDep) -> Any:
    """
    Get a specific user by id. (moderator function)
    """
    user = db.get(models.User, user_id)
    return user


@router.post(
    "/{user_id}",
    response_model=models.UserRead,
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def update_user_by_id(
    *,
    user_id: UUID,
    db: deps.SessionDep,
    user_in: models.UserUpdate,
) -> Any:
    """
    Modify user (moderator function)
    """
    db_obj = crud.user.get(db, id=user_id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if user_in.email:
        check_user = crud.user.get_by_email(db, email=user_in.email)
        if check_user and check_user.email != db_obj.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is not available.",
            )
    user = crud.user.update(db, db_obj=db_obj, obj_in=user_in)
    return user


@router.delete(
    "/{user_id}",
    response_model=models.Msg,
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def delete_user_by_id(
    *,
    user_id: UUID,
    db: deps.SessionDep,
) -> Any:
    """
    Delete user (moderator function)
    """
    db_obj = crud.user.get(db, id=user_id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    crud.user.remove(db, id=db_obj.id)
    return models.Msg(msg="User deleted successfully.")


@router.get(
    "/",
    response_model=list[models.UserRead],
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def read_all_users(
    *,
    db: deps.SessionDep,
    page: int = 0,
) -> Any:
    """
    Retrieve all current users.
    """
    return crud.user.get_multi(db=db, page=page)


@router.post(
    "/toggle-state",
    response_model=models.Msg,
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def toggle_state(
    *,
    db: deps.SessionDep,
    user_in: models.UserUpdate,
) -> Any:
    """
    Toggle user state (moderator function)
    """
    response = crud.user.toggle_user_state(db=db, obj_in=user_in)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request.",
        )
    return {"msg": "User state toggled successfully."}


@router.post(
    "/create",
    response_model=models.UserRead,
    dependencies=[Depends(deps.get_current_active_superuser)],
)
def create_user(
    *,
    db: deps.SessionDep,
    user_in: models.UserCreate,
) -> Any:
    """
    Create new user (moderator function).
    """
    user = crud.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )
    user = crud.user.create(db, obj_in=user_in)
    if settings.EMAILS_ENABLED and user_in.email:
        send_new_account_email(email_to=user_in.email, username=user_in.email)
    return user

```