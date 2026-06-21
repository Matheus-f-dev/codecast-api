from sqlalchemy.orm import Session

from app.models.studio import Studio
from app.schemas.studio import StudioCreate, StudioUpdate


class StudioRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[Studio]:
        return self.db.query(Studio).all()

    def get_by_id(self, studio_id: int) -> Studio | None:
        return self.db.query(Studio).filter(Studio.id == studio_id).first()

    def create(self, data: StudioCreate) -> Studio:
        studio = Studio(**data.model_dump())
        self.db.add(studio)
        self.db.commit()
        self.db.refresh(studio)
        return studio

    def update(self, studio: Studio, data: StudioUpdate) -> Studio:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(studio, field, value)
        self.db.commit()
        self.db.refresh(studio)
        return studio

    def delete(self, studio: Studio) -> None:
        self.db.delete(studio)
        self.db.commit()
