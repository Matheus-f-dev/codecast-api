from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.repositories.host import HostRepository
from app.schemas.host import HostCreate, HostResponse, HostUpdate


class HostService:
    def __init__(self, db: Session):
        self.repo = HostRepository(db)

    def list_hosts(self) -> list[HostResponse]:
        return self.repo.get_all()

    def get_host(self, host_id: int) -> HostResponse:
        host = self.repo.get_by_id(host_id)
        if not host:
            raise NotFoundError("Host não encontrado")
        return host

    def create_host(self, data: HostCreate) -> HostResponse:
        return self.repo.create(data)

    def update_host(self, host_id: int, data: HostUpdate) -> HostResponse:
        host = self.repo.get_by_id(host_id)
        if not host:
            raise NotFoundError("Host não encontrado")
        return self.repo.update(host, data)

    def delete_host(self, host_id: int) -> None:
        host = self.repo.get_by_id(host_id)
        if not host:
            raise NotFoundError("Host não encontrado")
        self.repo.delete(host)
