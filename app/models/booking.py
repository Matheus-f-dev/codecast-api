from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    studio_id: Mapped[int] = mapped_column(ForeignKey("studios.id"), nullable=False)
    host_id: Mapped[int] = mapped_column(ForeignKey("hosts.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    studio: Mapped["Studio"] = relationship(back_populates="bookings")
    host: Mapped["Host"] = relationship(back_populates="bookings")
