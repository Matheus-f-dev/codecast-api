from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.booking import BookingRepository
from app.repositories.host import HostRepository
from app.repositories.studio import StudioRepository
from app.schemas.booking import BookingCreate, BookingResponse


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

        return self.repo.create(data)
