from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


def get_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(db)


@router.get(
    "",
    response_model=list[BookingResponse],
    summary="Listar agendamentos",
)
def list_bookings(service: BookingService = Depends(get_service)):
    return service.get_all_bookings()


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar agendamento",
    description=(
        "Cria um novo agendamento vinculando um host a um estúdio em um intervalo de tempo.\n\n"
        "**Validações aplicadas:**\n"
        "- `studio_id` deve referenciar um estúdio existente\n"
        "- `host_id` deve referenciar um host existente\n"
        "- `end_time` deve ser posterior a `start_time`\n"
        "- O intervalo não pode se sobrepor a outro agendamento no mesmo estúdio"
    ),
    responses={
        201: {"description": "Agendamento criado com sucesso."},
        404: {"description": "Estúdio ou host não encontrado."},
        409: {"description": "Conflito de horário: já existe um agendamento nesse intervalo para o estúdio."},
        422: {"description": "Dados inválidos ou intervalo de tempo incoerente."},
    },
)
def create_booking(data: BookingCreate, service: BookingService = Depends(get_service)):
    return service.create_booking(data)
