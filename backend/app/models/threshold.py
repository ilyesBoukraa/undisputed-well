from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Metric(StrEnum):
    PRESSURE = "pressure"
    TEMPERATURE = "temperature"
    FLOW_RATE = "flow_rate"


class ThresholdConfig(Base):
    """
    One row per (well, metric): the warning/critical bands a reading for that
    metric on that well is evaluated against. Bands are independently
    optional — a well can have only a critical_max configured, for example —
    and a metric with no ThresholdConfig row at all simply never alerts.
    Deleting the well cascades (ON DELETE CASCADE): a well's threshold config
    has no meaning once the well itself is gone.
    """

    __tablename__ = "threshold_configs"
    __table_args__ = (UniqueConstraint("well_id", "metric", name="uq_threshold_well_metric"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    well_id: Mapped[int] = mapped_column(
        ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    warning_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    warning_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    critical_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    critical_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
