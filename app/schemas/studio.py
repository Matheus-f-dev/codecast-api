from pydantic import BaseModel, Field


class StudioBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    capacidade: int = Field(..., gt=0)
    equipamentos: list[str] = Field(default_factory=list)


class StudioCreate(StudioBase):
    pass


class StudioUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=100)
    capacidade: int | None = Field(None, gt=0)
    equipamentos: list[str] | None = None


class StudioResponse(StudioBase):
    id: int

    model_config = {"from_attributes": True}
