from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.studio import StudioCreate, StudioResponse, StudioUpdate
from app.services.studio import StudioService

router = APIRouter(prefix="/studios", tags=["studios"])


def get_service(db: Session = Depends(get_db)) -> StudioService:
    return StudioService(db)


@router.post(
    "",
    response_model=StudioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar estúdio",
    description="Cadastra um novo estúdio com nome, capacidade e lista de equipamentos.",
    responses={
        201: {"description": "Estúdio criado com sucesso."},
        422: {"description": "Dados inválidos."},
    },
)
def create_studio(data: StudioCreate, service: StudioService = Depends(get_service)):
    return service.create_studio(data)


@router.get(
    "",
    response_model=list[StudioResponse],
    summary="Listar estúdios",
    description="Retorna a lista de todos os estúdios cadastrados.",
    responses={
        200: {"description": "Lista retornada com sucesso."},
    },
)
def list_studios(service: StudioService = Depends(get_service)):
    return service.list_studios()


@router.get(
    "/{studio_id}",
    response_model=StudioResponse,
    summary="Buscar estúdio",
    description="Retorna os dados de um estúdio pelo seu ID.",
    responses={
        200: {"description": "Estúdio encontrado."},
        404: {"description": "Estúdio não encontrado."},
    },
)
def get_studio(studio_id: int, service: StudioService = Depends(get_service)):
    return service.get_studio(studio_id)


@router.put(
    "/{studio_id}",
    response_model=StudioResponse,
    summary="Atualizar estúdio",
    description="Atualiza parcialmente os dados de um estúdio. Apenas os campos informados são alterados.",
    responses={
        200: {"description": "Estúdio atualizado com sucesso."},
        404: {"description": "Estúdio não encontrado."},
        422: {"description": "Dados inválidos."},
    },
)
def update_studio(studio_id: int, data: StudioUpdate, service: StudioService = Depends(get_service)):
    return service.update_studio(studio_id, data)


@router.delete(
    "/{studio_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover estúdio",
    description="Remove permanentemente um estúdio pelo seu ID.",
    responses={
        204: {"description": "Estúdio removido com sucesso."},
        404: {"description": "Estúdio não encontrado."},
    },
)
def delete_studio(studio_id: int, service: StudioService = Depends(get_service)):
    service.delete_studio(studio_id)
