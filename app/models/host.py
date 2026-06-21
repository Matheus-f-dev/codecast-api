from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class Host(Base):
    __tablename__ = "hosts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="host")
