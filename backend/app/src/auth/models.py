from fastapi_myauth.auth import AuthComponents
from fastapi_myauth.config import Settings as BaseAuthSettings
from fastapi_myauth.models import User as BaseUser
from fastapi_myauth.models import UserCreate as BaseUserCreate
from fastapi_myauth.models import UserRead as BaseUserRead
from fastapi_myauth.models import UserUpdate as BaseUserUpdate
from sqlmodel import Field

from .config import auth_settings


# --- Custom User Database Model ---
class CustomUser(BaseUser):
    # Add your custom fields here:
    language: str = Field(default="en", max_length=10)


# --- Custom User Pydantic Models for API operations ---


# For creation: include fields that can be set when a user signs up/is created
class CustomUserCreate(BaseUserCreate):
    language: str | None = None  # Allow language to be optional on creation


# For reading: include fields you want to expose when fetching user data
class CustomUserRead(BaseUserRead):
    language: str  # Ensure language is included when reading


# For updating: include fields that can be updated by the user or admin
class CustomUserUpdate(BaseUserUpdate):
    language: str | None = None  # Allow language to be optional on update


auth_components = AuthComponents(
    config=BaseAuthSettings(**auth_settings.model_dump()),
    user_model=CustomUser,
    user_read=CustomUserRead,
    user_create=CustomUserCreate,
    user_update=CustomUserUpdate,
)
