from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.well import WellStatus


class WellCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    status: WellStatus = WellStatus.DRILLING
    depth_m: float | None = Field(default=None, ge=0)
    spud_date: date | None = None
    rig_id: int | None = None


class WellUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: WellStatus | None = None
    depth_m: float | None = Field(default=None, ge=0)
    spud_date: date | None = None
    rig_id: int | None = None


class RigSummary(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class WellOut(BaseModel):
    id: int
    name: str
    status: str
    depth_m: float | None
    spud_date: date | None
    rig_id: int | None
    rig: RigSummary | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WellListOut(BaseModel):
    items: list[WellOut]
    total: int
