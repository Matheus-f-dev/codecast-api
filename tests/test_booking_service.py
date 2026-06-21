from datetime import datetime

import pytest

from app.core.exceptions import BookingConflictError, NotFoundError
from app.schemas.booking import BookingCreate
from app.schemas.host import HostCreate
from app.schemas.studio import StudioCreate
from app.services.booking import BookingService
from app.services.host import HostService
from app.services.studio import StudioService


def make_studio(db, nome="Estúdio A"):
    return StudioService(db).create_studio(StudioCreate(nome=nome, capacidade=5, equipamentos=[]))


def make_host(db, nome="João Silva"):
    return HostService(db).create_host(HostCreate(nome=nome))


def make_booking(db, studio_id, host_id, start, end):
    return BookingService(db).create_booking(
        BookingCreate(studio_id=studio_id, host_id=host_id, start_time=start, end_time=end)
    )


T = datetime


class TestBookingCreate:
    def test_cria_booking_valido(self, db):
        studio = make_studio(db)
        host = make_host(db)
        booking = make_booking(db, studio.id, host.id, T(2025, 1, 15, 10), T(2025, 1, 15, 11))
        assert booking.id is not None
        assert booking.studio_id == studio.id
        assert booking.host_id == host.id

    def test_studio_inexistente_lanca_not_found(self, db):
        host = make_host(db)
        with pytest.raises(NotFoundError, match="Studio"):
            make_booking(db, 999, host.id, T(2025, 1, 15, 10), T(2025, 1, 15, 11))

    def test_host_inexistente_lanca_not_found(self, db):
        studio = make_studio(db)
        with pytest.raises(NotFoundError, match="Host"):
            make_booking(db, studio.id, 999, T(2025, 1, 15, 10), T(2025, 1, 15, 11))


class TestBookingConflict:
    def setup_method(self):
        self.start = T(2025, 1, 15, 10)
        self.end = T(2025, 1, 15, 11)

    def test_sobreposicao_parcial_inicio(self, db):
        studio = make_studio(db)
        host = make_host(db)
        make_booking(db, studio.id, host.id, self.start, self.end)
        with pytest.raises(BookingConflictError):
            make_booking(db, studio.id, host.id, T(2025, 1, 15, 10, 30), T(2025, 1, 15, 11, 30))

    def test_sobreposicao_parcial_fim(self, db):
        studio = make_studio(db)
        host = make_host(db)
        make_booking(db, studio.id, host.id, self.start, self.end)
        with pytest.raises(BookingConflictError):
            make_booking(db, studio.id, host.id, T(2025, 1, 15, 9, 30), T(2025, 1, 15, 10, 30))

    def test_sobreposicao_envolvente(self, db):
        studio = make_studio(db)
        host = make_host(db)
        make_booking(db, studio.id, host.id, self.start, self.end)
        with pytest.raises(BookingConflictError):
            make_booking(db, studio.id, host.id, T(2025, 1, 15, 9), T(2025, 1, 15, 12))

    def test_sem_conflito_mesmo_horario_outro_studio(self, db):
        studio1 = make_studio(db, nome="Estúdio A")
        studio2 = make_studio(db, nome="Estúdio B")
        host = make_host(db)
        make_booking(db, studio1.id, host.id, self.start, self.end)
        booking = make_booking(db, studio2.id, host.id, self.start, self.end)
        assert booking.id is not None

    def test_sem_conflito_horario_adjacente(self, db):
        studio = make_studio(db)
        host = make_host(db)
        make_booking(db, studio.id, host.id, self.start, self.end)
        booking = make_booking(db, studio.id, host.id, T(2025, 1, 15, 11), T(2025, 1, 15, 12))
        assert booking.id is not None
