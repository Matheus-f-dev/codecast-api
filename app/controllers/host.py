from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.host import HostCreate, HostResponse, HostUpdate
from app.services.host import HostService

router = APIRouter(prefix="/hosts", tags=["hosts"])


def get_service(db: Session = Depends(get_db)) -> HostService:
    return HostService(db)


@router.post("", response_model=HostResponse, status_code=status.HTTP_201_CREATED)
def create_host(data: HostCreate, service: HostService = Depends(get_service)):
    return service.create_host(data)


@router.get("", response_model=list[HostResponse])
def list_hosts(service: HostService = Depends(get_service)):
    return service.list_hosts()


@router.get("/{host_id}", response_model=HostResponse)
def get_host(host_id: int, service: HostService = Depends(get_service)):
    return service.get_host(host_id)


@router.put("/{host_id}", response_model=HostResponse)
def update_host(host_id: int, data: HostUpdate, service: HostService = Depends(get_service)):
    return service.update_host(host_id, data)


@router.delete("/{host_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_host(host_id: int, service: HostService = Depends(get_service)):
    service.delete_host(host_id)
