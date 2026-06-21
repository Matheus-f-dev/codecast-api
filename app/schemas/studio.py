from pydantic import BaseModel, Field


class StudioBase(BaseModel):
    nome: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nome do estúdio.",
        examples=["Estúdio A", "Estúdio Principal"],
    )
    capacidade: int = Field(
        ...,
        gt=0,
        description="Capacidade máxima de pessoas no estúdio.",
        examples=[5, 10],
    )
    equipamentos: list[str] = Field(
        default_factory=list,
        description="Lista de equipamentos disponíveis no estúdio.",
        examples=[["Microfone Condensador", "Mesa de Som", "Fone de Ouvido"]],
    )


class StudioCreate(StudioBase):
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nome": "Estúdio A",
                    "capacidade": 5,
                    "equipamentos": ["Microfone Condensador", "Mesa de Som"],
                }
            ]
        }
    }


class StudioUpdate(BaseModel):
    nome: str | None = Field(
        None,
        min_length=2,
        max_length=100,
        description="Novo nome do estúdio.",
        examples=["Estúdio B"],
    )
    capacidade: int | None = Field(
        None,
        gt=0,
        description="Nova capacidade do estúdio.",
        examples=[8],
    )
    equipamentos: list[str] | None = Field(
        None,
        description="Nova lista de equipamentos.",
        examples=[["Microfone Dinâmico", "Interface de Áudio"]],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nome": "Estúdio B",
                    "capacidade": 8,
                    "equipamentos": ["Microfone Dinâmico", "Interface de Áudio"],
                }
            ]
        }
    }


class StudioResponse(StudioBase):
    id: int = Field(..., description="Identificador único do estúdio.", examples=[1])

    model_config = {"from_attributes": True}
