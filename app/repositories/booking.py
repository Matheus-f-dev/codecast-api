from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.schemas.booking import BookingCreate


class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: BookingCreate) -> Booking:
        booking = Booking(**data.model_dump())
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)
        return booking
