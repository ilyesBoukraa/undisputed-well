from datetime import date, datetime, timezone
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.rig import Rig


class WellStatus(StrEnum):
    DRILLING = "drilling"
    PRODUCING = "producing"
    SHUT_IN = "shut_in"
    ABANDONED = "abandoned"


class Well(Base):
    __tablename__ = "wells"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=WellStatus.DRILLING.value
    )
    depth_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    spud_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rig_id: Mapped[int | None] = mapped_column(
        ForeignKey("rigs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    rig: Mapped["Rig | None"] = relationship(back_populates="wells")
