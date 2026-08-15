from datetime import datetime

from pydantic import BaseModel, Field

from app.models.operation import AlertSeverity
from app.models.threshold import Metric


class ThresholdConfigCreate(BaseModel):
    well_id: int
    metric: Metric
    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None


class ThresholdConfigUpdate(BaseModel):
    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None


class ThresholdConfigOut(BaseModel):
    id: int
    well_id: int
    metric: str
    warning_min: float | None
    warning_max: float | None
    critical_min: float | None
    critical_max: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ThresholdConfigListOut(BaseModel):
    items: list[ThresholdConfigOut]
    total: int


class ReadingCreate(BaseModel):
    well_id: int
    metric: Metric
    value: float
    recorded_at: datetime | None = None


class ReadingOut(BaseModel):
    id: int
    well_id: int
    metric: str
    value: float
    status: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class ReadingListOut(BaseModel):
    items: list[ReadingOut]
    total: int


class AlertOut(BaseModel):
    id: int
    well_id: int
    metric: str
    value: float
    severity: str
    acknowledged: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListOut(BaseModel):
    items: list[AlertOut]
    total: int


class ReadingCreateResponse(BaseModel):
    reading: ReadingOut
    alert: AlertOut | None = None


# Re-exported so callers only need to import from this module.
__all__ = [
    "Metric",
    "AlertSeverity",
    "ThresholdConfigCreate",
    "ThresholdConfigUpdate",
    "ThresholdConfigOut",
    "ThresholdConfigListOut",
    "ReadingCreate",
    "ReadingOut",
    "ReadingListOut",
    "AlertOut",
    "AlertListOut",
    "ReadingCreateResponse",
]
