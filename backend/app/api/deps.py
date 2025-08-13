from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app import crud, models
from app.core.config import settings
from app.core.db import engine

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/oauth")


def get_db():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_token_payload(token: str) -> models.TokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGO])
        token_data = models.TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_current_user(
    db: SessionDep,
    token: TokenDep,
) -> models.User:
    token_data = get_token_payload(token)
    if token_data.refresh or token_data.totp:
        # Refresh token is not a valid access token and TOTP True can only be used to validate TOTP
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


CurrentUser = Annotated[models.User, Depends(get_current_user)]


def get_totp_user(
    db: SessionDep,
    token: TokenDep,
) -> models.User:
    token_data = get_token_payload(token)
    if token_data.refresh or not token_data.totp:
        # Refresh token is not a valid access token and TOTP False cannot be used to validate TOTP
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


def get_magic_token(
    token: TokenDep,
) -> models.MagicTokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGO])
        token_data = models.MagicTokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_refresh_user(
    db: SessionDep,
    token: TokenDep,
) -> models.User:
    token_data = get_token_payload(token)
    if not token_data.refresh:
        # Access token is not a valid refresh token
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if not crud.user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    # Check and revoke this refresh token
    token_obj = crud.token.get(token=token, user=user)
    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    crud.token.remove(db, db_obj=token_obj)
    return user


def get_current_active_user(
    current_user: CurrentUser,
) -> models.User:
    if not crud.user.is_active(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


CurrentActiveUser = Annotated[models.User, Depends(get_current_active_user)]


def get_current_active_superuser(
    current_user: CurrentUser,
) -> models.User:
    if not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def get_active_websocket_user(*, db: Session, token: str) -> models.User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGO])
        token_data = models.TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise ValidationError("Could not validate credentials")
    if token_data.refresh:
        # Refresh token is not a valid access token
        raise ValidationError("Could not validate credentials")
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise ValidationError("User not found")
    if not crud.user.is_active(user):
        raise ValidationError("Inactive user")
    return user
