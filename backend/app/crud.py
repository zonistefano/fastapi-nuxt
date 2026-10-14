from typing import Any

from fastapi_myauth.transactions import persist
from pydantic import BaseModel
from sqlmodel import Session, SQLModel, select

from app.core.config import settings


class CRUDBase[
    ModelType: SQLModel,
    CreateSchemaType: BaseModel,
    UpdateSchemaType: BaseModel,
]:
    def __init__(self, model: type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).

        **Parameters**

        * `model`: A SQLAlchemy model class
        The generic schema types describe accepted creation and update data.
        """
        self.model = model

    def get(self, db: Session, id: Any) -> ModelType | None:
        return db.get(self.model, id)

    def get_multi(
        self, db: Session, *, page: int = 0, page_break: bool = False
    ) -> list[ModelType]:
        statement = select(self.model)
        if page < 0:
            raise ValueError("Page must be greater than or equal to zero.")
        statement = statement.order_by(*self.model.__table__.primary_key.columns)
        if not page_break:
            if page > 0:
                statement = statement.offset(page * settings.MULTI_MAX)
            statement = statement.limit(settings.MULTI_MAX)
        db_objs = db.exec(statement)
        return list(db_objs.all())

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model.model_validate(obj_in)
        db.add(db_obj)
        persist(db, db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType | dict[str, Any],
    ) -> ModelType:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        db_obj.sqlmodel_update(update_data)
        db.add(db_obj)
        persist(db, db_obj)
        return db_obj

    def remove(self, db: Session, *, id: Any) -> ModelType | None:
        obj = db.get(self.model, id)
        if obj is None:
            return None
        db.delete(obj)
        persist(db)
        return obj
