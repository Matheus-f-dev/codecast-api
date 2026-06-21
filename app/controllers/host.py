from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.host import HostCreate, HostResponse, HostUpdate
from app.services.host import HostService

router = APIRouter(prefix="/hosts", tags=["hosts"])


def get_service(db: Session = Depends(get_db)) -> HostService:
    return HostService(db)


@router.post(
    "",
    response_model=HostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar host",
    description="Cadastra um novo host com nome.",
    responses={
        201: {"description": "Host criado com sucesso."},
        422: {"description": "Dados inválidos."},
    },
)
def create_host(data: HostCreate, service: HostService = Depends(get_service)):
    return service.create_host(data)


@router.get(
    "",
    response_model=list[HostResponse],
    summary="Listar hosts",
    description="Retorna a lista de todos os hosts cadastrados.",
    responses={
        200: {"description": "Lista retornada com sucesso."},
    },
)
def list_hosts(service: HostService = Depends(get_service)):
    return service.list_hosts()


@router.get(
    "/{host_id}",
    response_model=HostResponse,
    summary="Buscar host",
    description="Retorna os dados de um host pelo seu ID.",
    responses={
        200: {"description": "Host encontrado."},
        404: {"description": "Host não encontrado."},
    },
)
def get_host(host_id: int, service: HostService = Depends(get_service)):
    return service.get_host(host_id)


@router.put(
    "/{host_id}",
    response_model=HostResponse,
    summary="Atualizar host",
    description="Atualiza o nome de um host pelo seu ID.",
    responses={
        200: {"description": "Host atualizado com sucesso."},
        404: {"description": "Host não encontrado."},
        422: {"description": "Dados inválidos."},
    },
)
def update_host(host_id: int, data: HostUpdate, service: HostService = Depends(get_service)):
    return service.update_host(host_id, data)


@router.delete(
    "/{host_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover host",
    description="Remove permanentemente um host pelo seu ID.",
    responses={
        204: {"description": "Host removido com sucesso."},
        404: {"description": "Host não encontrado."},
    },
)
def delete_host(host_id: int, service: HostService = Depends(get_service)):
    service.delete_host(host_id)
