from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


def get_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, service: BookingService = Depends(get_service)):
    return service.create_booking(data)
