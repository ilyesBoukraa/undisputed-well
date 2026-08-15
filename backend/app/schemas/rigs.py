from datetime import datetime

from pydantic import BaseModel, Field

from app.models.rig import RigStatus


class RigCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location: str = Field(min_length=1, max_length=255)
    status: RigStatus = RigStatus.ACTIVE


class RigUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, min_length=1, max_length=255)
    status: RigStatus | None = None


class RigOut(BaseModel):
    id: int
    name: str
    location: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RigListOut(BaseModel):
    items: list[RigOut]
    total: int
