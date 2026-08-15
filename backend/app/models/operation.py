from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AlertSeverity(StrEnum):
    WARNING = "warning"
    CRITICAL = "critical"


class OperationReading(Base):
    """
    A single telemetry data point for a well/metric. `status` is computed
    against that well's ThresholdConfig (if any) at ingestion time and stored
    denormalized — a reading's status reflects the thresholds in effect when
    it was recorded, not whatever the thresholds happen to be now. See
    services/operations.py for the evaluation logic.
    """

    __tablename__ = "operation_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    well_id: Mapped[int] = mapped_column(
        ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class ThresholdAlert(Base):
    """
    Created whenever a reading evaluates to warning/breach. Read via the
    REST list endpoint for the initial dashboard load, and streamed live via
    SSE (see api/operations.py) for anything created after a client connects.
    """

    __tablename__ = "threshold_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    well_id: Mapped[int] = mapped_column(
        ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
