from sqlalchemy.orm import Session

from app.models.host import Host
from app.schemas.host import HostCreate, HostUpdate


class HostRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[Host]:
        return self.db.query(Host).all()

    def get_by_id(self, host_id: int) -> Host | None:
        return self.db.query(Host).filter(Host.id == host_id).first()

    def create(self, data: HostCreate) -> Host:
        host = Host(**data.model_dump())
        self.db.add(host)
        self.db.commit()
        self.db.refresh(host)
        return host

    def update(self, host: Host, data: HostUpdate) -> Host:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(host, field, value)
        self.db.commit()
        self.db.refresh(host)
        return host

    def delete(self, host: Host) -> None:
        self.db.delete(host)
        self.db.commit()
