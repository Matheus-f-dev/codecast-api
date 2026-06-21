from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class BookingCreate(BaseModel):
    studio_id: int = Field(..., gt=0, description="ID do estúdio a ser reservado.", examples=[1])
    host_id: int = Field(..., gt=0, description="ID do host responsável pelo agendamento.", examples=[1])
    start_time: datetime = Field(
        ...,
        description="Data e hora de início do agendamento (ISO 8601).",
        examples=["2025-01-15T10:00:00"],
    )
    end_time: datetime = Field(
        ...,
        description="Data e hora de término do agendamento (ISO 8601). Deve ser posterior a start_time.",
        examples=["2025-01-15T11:00:00"],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "studio_id": 1,
                    "host_id": 1,
                    "start_time": "2025-01-15T10:00:00",
                    "end_time": "2025-01-15T11:00:00",
                }
            ]
        }
    }

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookingCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time deve ser posterior a start_time")
        return self


class BookingResponse(BaseModel):
    id: int = Field(..., description="Identificador único do agendamento.", examples=[1])
    studio_id: int = Field(..., description="ID do estúdio reservado.", examples=[1])
    host_id: int = Field(..., description="ID do host responsável.", examples=[1])
    start_time: datetime = Field(..., description="Início do agendamento.", examples=["2025-01-15T10:00:00"])
    end_time: datetime = Field(..., description="Término do agendamento.", examples=["2025-01-15T11:00:00"])

    model_config = {"from_attributes": True}
