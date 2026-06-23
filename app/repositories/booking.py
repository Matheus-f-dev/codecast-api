from datetime import datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.schemas.booking import BookingCreate


class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def has_conflict(self, studio_id: int, start_time: datetime, end_time: datetime) -> bool:
        return self.db.query(Booking).filter(
            and_(
                Booking.studio_id == studio_id,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        ).first() is not None

    def get_all(self) -> list[Booking]:
        return self.db.query(Booking).all()

    def create(self, data: BookingCreate) -> Booking:
        booking = Booking(**data.model_dump())
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)
        return booking
