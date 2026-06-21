from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.studio import StudioCreate, StudioResponse, StudioUpdate
from app.services.studio import StudioService

router = APIRouter(prefix="/studios", tags=["studios"])


def get_service(db: Session = Depends(get_db)) -> StudioService:
    return StudioService(db)


@router.post("", response_model=StudioResponse, status_code=status.HTTP_201_CREATED)
def create_studio(data: StudioCreate, service: StudioService = Depends(get_service)):
    return service.create_studio(data)


@router.get("", response_model=list[StudioResponse])
def list_studios(service: StudioService = Depends(get_service)):
    return service.list_studios()


@router.get("/{studio_id}", response_model=StudioResponse)
def get_studio(studio_id: int, service: StudioService = Depends(get_service)):
    return service.get_studio(studio_id)


@router.put("/{studio_id}", response_model=StudioResponse)
def update_studio(studio_id: int, data: StudioUpdate, service: StudioService = Depends(get_service)):
    return service.update_studio(studio_id, data)


@router.delete("/{studio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_studio(studio_id: int, service: StudioService = Depends(get_service)):
    service.delete_studio(studio_id)
