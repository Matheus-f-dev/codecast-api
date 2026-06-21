from pydantic import BaseModel, Field


class HostBase(BaseModel):
    nome: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nome completo do host.",
        examples=["João Silva", "Maria Oliveira"],
    )


class HostCreate(HostBase):
    model_config = {
        "json_schema_extra": {
            "examples": [
                {"nome": "João Silva"}
            ]
        }
    }


class HostUpdate(BaseModel):
    nome: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Novo nome do host.",
        examples=["Maria Oliveira"],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"nome": "Maria Oliveira"}
            ]
        }
    }


class HostResponse(HostBase):
    id: int = Field(..., description="Identificador único do host.", examples=[1])

    model_config = {"from_attributes": True}
