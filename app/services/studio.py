from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.studio import StudioRepository
from app.schemas.studio import StudioCreate, StudioResponse, StudioUpdate


class StudioService:
    def __init__(self, db: Session):
        self.repo = StudioRepository(db)

    def list_studios(self) -> list[StudioResponse]:
        return self.repo.get_all()

    def get_studio(self, studio_id: int) -> StudioResponse:
        studio = self.repo.get_by_id(studio_id)
        if not studio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio não encontrado")
        return studio

    def create_studio(self, data: StudioCreate) -> StudioResponse:
        return self.repo.create(data)

    def update_studio(self, studio_id: int, data: StudioUpdate) -> StudioResponse:
        studio = self.repo.get_by_id(studio_id)
        if not studio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio não encontrado")
        return self.repo.update(studio, data)

    def delete_studio(self, studio_id: int) -> None:
        studio = self.repo.get_by_id(studio_id)
        if not studio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio não encontrado")
        self.repo.delete(studio)
