import pytest
from fastapi_myauth.transactions import transaction
from sqlmodel import Session

from app.crud import CRUDBase
from app.src.auth.models import CustomUserCreate, CustomUserUpdate
from app.src.auth.service import auth


@pytest.fixture
def crud():
    return CRUDBase[auth.User, CustomUserCreate, CustomUserUpdate](auth.User)


def test_removing_unknown_object_is_safe(crud, db):
    from uuid import uuid4

    assert crud.remove(db, id=uuid4()) is None


def test_create_and_delete_are_part_of_the_callers_transaction(crud, db: Session):
    user_in = CustomUserCreate(email="rollback@example.com")
    with pytest.raises(RuntimeError):
        with transaction(db):
            crud.create(db, obj_in=user_in)
            raise RuntimeError("Later operation failed")
    assert auth.crud_user.get_by_email(db, email=user_in.email) is None


def test_pagination_rejects_negative_pages(crud, db):
    with pytest.raises(ValueError):
        crud.get_multi(db, page=-1)


def test_pagination_is_stable_and_partial_updates_preserve_fields(
    crud, db, monkeypatch
):
    from uuid import UUID

    from app.core.config import settings

    monkeypatch.setattr(settings, "MULTI_MAX", 2)
    identities = []
    for number in range(1, 6):
        user = auth.User(
            id=UUID(int=number),
            email=f"pagination{number}@example.com",
            full_name="Initial",
        )
        db.add(user)
        identities.append(user.id)
    db.commit()
    assert [user.id for user in crud.get_multi(db, page=0)] == identities[:2]
    assert [user.id for user in crud.get_multi(db, page=1)] == identities[2:4]
    user = crud.get(db, id=identities[0])
    updated = crud.update(db, db_obj=user, obj_in=CustomUserUpdate(full_name="Updated"))
    assert updated.full_name == "Updated"
    assert updated.language == "en"
    assert crud.remove(db, id=identities[0]).id == identities[0]
    assert crud.get(db, id=identities[0]) is None
