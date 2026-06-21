from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class Studio(Base):
    __tablename__ = "studios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    capacidade: Mapped[int] = mapped_column(Integer, nullable=False)
    equipamentos: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="studio")
