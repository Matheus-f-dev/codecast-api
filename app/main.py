from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.booking import router as booking_router
from app.controllers.host import router as host_router
from app.controllers.studio import router as studio_router
from app.core.config import settings
from app.middlewares.error_handler import register_error_handlers

TAGS_METADATA = [
    {
        "name": "studios",
        "description": "Gerenciamento de estúdios de gravação. Permite criar, consultar, atualizar e remover estúdios disponíveis para agendamento.",
    },
    {
        "name": "hosts",
        "description": "Gerenciamento de hosts. Hosts são os apresentadores ou locutores que realizam agendamentos nos estúdios.",
    },
    {
        "name": "bookings",
        "description": "Gerenciamento de agendamentos. Vincula um host a um estúdio em um intervalo de tempo, com validação de conflito de horário.",
    },
    {
        "name": "health",
        "description": "Verificação de disponibilidade da API.",
    },
]

app = FastAPI(
    title="Codecast API",
    version="1.0.0",
    description=(
        "API de gerenciamento de estúdios de podcast e agendamentos.\n\n"
        "Permite cadastrar **estúdios**, **hosts** e realizar **agendamentos** "
        "com validação automática de conflito de horário."
    ),
    contact={
        "name": "CODE Jr",
        "email": "contato@codejr.com.br",
    },
    license_info={
        "name": "MIT",
    },
    openapi_tags=TAGS_METADATA,
    debug=settings.debug,
)

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(studio_router)
app.include_router(host_router)
app.include_router(booking_router)


@app.get("/health", tags=["health"], summary="Health check", description="Retorna o status de disponibilidade da API.")
def health_check():
    return {"status": "ok"}
