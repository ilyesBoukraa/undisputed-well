from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RiskLevel(StrEnum):
    STABLE = "stable"
    AT_RISK = "at_risk"
    UNSTABLE = "unstable"


class Prediction(Base):
    """
    A single asphaltene-stability screening run for a well. Inputs are
    stored alongside the computed outputs so a past prediction is a
    self-contained record — see services/predictions.py for the model
    itself, which is a simplified, clearly-labeled screening heuristic
    (Standing's bubble-point correlation + a resin/asphaltene-ratio-driven
    instability envelope), not a validated PVT/thermodynamic simulator.
    """

    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    well_id: Mapped[int] = mapped_column(
        ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )

    reservoir_pressure_psi: Mapped[float] = mapped_column(Float, nullable=False)
    reservoir_temperature_f: Mapped[float] = mapped_column(Float, nullable=False)
    api_gravity: Mapped[float] = mapped_column(Float, nullable=False)
    gas_specific_gravity: Mapped[float] = mapped_column(Float, nullable=False)
    solution_gor_scf_stb: Mapped[float] = mapped_column(Float, nullable=False)
    resin_asphaltene_ratio: Mapped[float] = mapped_column(Float, nullable=False)

    bubble_point_pressure_psi: Mapped[float] = mapped_column(Float, nullable=False)
    onset_pressure_psi: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    # List of {"pressure": float, "instability_index": float}, swept from
    # reservoir pressure down to atmospheric — see services/predictions.py.
    curve: Mapped[list] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
