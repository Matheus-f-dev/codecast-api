from sqlalchemy.orm import Session

from app.core.exceptions import BookingConflictError
from app.repositories.booking import BookingRepository
from app.repositories.host import HostRepository
from app.repositories.studio import StudioRepository
from app.schemas.booking import BookingCreate, BookingResponse
from fastapi import HTTPException, status


class BookingService:
    def __init__(self, db: Session):
        self.repo = BookingRepository(db)
        self.studios = StudioRepository(db)
        self.hosts = HostRepository(db)

    def create_booking(self, data: BookingCreate) -> BookingResponse:
        if not self.studios.get_by_id(data.studio_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio não encontrado")

        if not self.hosts.get_by_id(data.host_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host não encontrado")

        if self.repo.has_conflict(data.studio_id, data.start_time, data.end_time):
            raise BookingConflictError(data.studio_id)

        return self.repo.create(data)
