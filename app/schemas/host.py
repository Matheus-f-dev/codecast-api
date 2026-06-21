from pydantic import BaseModel, Field


class HostBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)


class HostCreate(HostBase):
    pass


class HostUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=100)


class HostResponse(HostBase):
    id: int

    model_config = {"from_attributes": True}
