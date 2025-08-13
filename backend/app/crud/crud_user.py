from pydantic import EmailStr
from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password

from ..models import NewTOTP, User, UserCreate, UserUpdate
from .base import CRUDBase


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> User | None:
        return db.exec(select(User).where(User.email == email)).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password)
            if obj_in.password is not None
            else None,
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.model_dump(exclude_unset=True)
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        if update_data.get("email") and db_obj.email != update_data["email"]:
            update_data["email_validated"] = False
        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def authenticate(
        self, db: Session, *, email: str, password: str | None
    ) -> User | None:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(
            plain_password=password, hashed_password=user.hashed_password
        ):
            return None
        return user

    def validate_email(self, db: Session, *, db_obj: User) -> User:
        obj_in = {"email_validated": True}
        return super().update(db=db, db_obj=db_obj, obj_in=obj_in)

    def activate_totp(self, db: Session, *, db_obj: User, totp_in: NewTOTP) -> User:
        obj_in = {"totp_secret": totp_in.secret}
        return super().update(db=db, db_obj=db_obj, obj_in=obj_in)

    def deactivate_totp(self, db: Session, *, db_obj: User) -> User:
        obj_in = {"totp_secret": None, "totp_counter": None}
        return super().update(db=db, db_obj=db_obj, obj_in=obj_in)

    def update_totp_counter(
        self, db: Session, *, db_obj: User, new_counter: int
    ) -> User:
        obj_in = {"totp_counter": new_counter}
        return super().update(db=db, db_obj=db_obj, obj_in=obj_in)

    def toggle_user_state(self, db: Session, *, user_email: EmailStr) -> User | None:
        db_obj = self.get_by_email(db, email=user_email)
        if not db_obj:
            return None
        db_obj.is_active = not db_obj.is_active
        obj_in = UserUpdate(
            email=db_obj.email,
            is_active=db_obj.is_active,
        )
        return super().update(db=db, db_obj=db_obj, obj_in=obj_in)

    def has_password(self, user: User) -> bool:
        if user.hashed_password:
            return True
        return False

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser

    def is_email_validated(self, user: User) -> bool:
        return user.email_validated


user = CRUDUser(User)
