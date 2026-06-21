from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class BookingCreate(BaseModel):
    studio_id: int = Field(..., gt=0)
    host_id: int = Field(..., gt=0)
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookingCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time deve ser posterior a start_time")
        return self


class BookingResponse(BaseModel):
    id: int
    studio_id: int
    host_id: int
    start_time: datetime
    end_time: datetime

    model_config = {"from_attributes": True}
