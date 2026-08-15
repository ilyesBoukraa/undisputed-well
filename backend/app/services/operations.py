from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models.operation import AlertSeverity, OperationReading, ThresholdAlert
from app.models.threshold import ThresholdConfig
from app.models.well import Well
from app.schemas.operations import ReadingCreate, ThresholdConfigCreate, ThresholdConfigUpdate


class WellNotFoundError(Exception):
    pass


class DuplicateThresholdError(Exception):
    pass


class ThresholdNotFoundError(Exception):
    pass


def evaluate_status(threshold: ThresholdConfig | None, value: float) -> str:
    """
    Bands are checked critical-before-warning, and each band is independently
    optional (None = "no bound configured for this side"). No ThresholdConfig
    row at all means the metric is never alerted on for that well.
    """
    if threshold is None:
        return "normal"
    if threshold.critical_max is not None and value >= threshold.critical_max:
        return "breach"
    if threshold.critical_min is not None and value <= threshold.critical_min:
        return "breach"
    if threshold.warning_max is not None and value >= threshold.warning_max:
        return "warning"
    if threshold.warning_min is not None and value <= threshold.warning_min:
        return "warning"
    return "normal"


def get_threshold_for(db: DbSession, well_id: int, metric: str) -> ThresholdConfig | None:
    return db.execute(
        select(ThresholdConfig).where(
            ThresholdConfig.well_id == well_id, ThresholdConfig.metric == metric
        )
    ).scalar_one_or_none()


def create_reading(
    db: DbSession, payload: ReadingCreate
) -> tuple[OperationReading, ThresholdAlert | None]:
    if db.get(Well, payload.well_id) is None:
        raise WellNotFoundError(payload.well_id)

    threshold = get_threshold_for(db, payload.well_id, payload.metric.value)
    status = evaluate_status(threshold, payload.value)

    reading = OperationReading(
        well_id=payload.well_id,
        metric=payload.metric.value,
        value=payload.value,
        status=status,
        recorded_at=payload.recorded_at or datetime.now(timezone.utc),
    )
    db.add(reading)

    alert: ThresholdAlert | None = None
    if status in ("warning", "breach"):
        severity = AlertSeverity.CRITICAL if status == "breach" else AlertSeverity.WARNING
        alert = ThresholdAlert(
            well_id=payload.well_id,
            metric=payload.metric.value,
            value=payload.value,
            severity=severity.value,
        )
        db.add(alert)

    db.commit()
    db.refresh(reading)
    if alert is not None:
        db.refresh(alert)
    return reading, alert


def list_readings(
    db: DbSession, *, well_id: int | None = None, metric: str | None = None
) -> list[OperationReading]:
    stmt = select(OperationReading).order_by(OperationReading.recorded_at.desc())
    if well_id is not None:
        stmt = stmt.where(OperationReading.well_id == well_id)
    if metric is not None:
        stmt = stmt.where(OperationReading.metric == metric)
    return list(db.execute(stmt).scalars().all())


def list_thresholds(db: DbSession, *, well_id: int | None = None) -> list[ThresholdConfig]:
    stmt = select(ThresholdConfig).order_by(ThresholdConfig.well_id, ThresholdConfig.metric)
    if well_id is not None:
        stmt = stmt.where(ThresholdConfig.well_id == well_id)
    return list(db.execute(stmt).scalars().all())


def create_threshold(db: DbSession, payload: ThresholdConfigCreate) -> ThresholdConfig:
    if db.get(Well, payload.well_id) is None:
        raise WellNotFoundError(payload.well_id)
    if get_threshold_for(db, payload.well_id, payload.metric.value) is not None:
        raise DuplicateThresholdError(payload.well_id, payload.metric.value)

    threshold = ThresholdConfig(
        well_id=payload.well_id,
        metric=payload.metric.value,
        warning_min=payload.warning_min,
        warning_max=payload.warning_max,
        critical_min=payload.critical_min,
        critical_max=payload.critical_max,
    )
    db.add(threshold)
    db.commit()
    db.refresh(threshold)
    return threshold


def get_threshold(db: DbSession, threshold_id: int) -> ThresholdConfig | None:
    return db.get(ThresholdConfig, threshold_id)


def update_threshold(
    db: DbSession, threshold: ThresholdConfig, payload: ThresholdConfigUpdate
) -> ThresholdConfig:
    updates = payload.model_dump(exclude_unset=True)
    for field in ("warning_min", "warning_max", "critical_min", "critical_max"):
        if field in updates:
            setattr(threshold, field, updates[field])
    db.commit()
    db.refresh(threshold)
    return threshold


def delete_threshold(db: DbSession, threshold: ThresholdConfig) -> None:
    db.delete(threshold)
    db.commit()


def list_alerts(
    db: DbSession,
    *,
    well_id: int | None = None,
    acknowledged: bool | None = None,
    limit: int = 100,
) -> list[ThresholdAlert]:
    stmt = select(ThresholdAlert).order_by(ThresholdAlert.created_at.desc()).limit(limit)
    if well_id is not None:
        stmt = stmt.where(ThresholdAlert.well_id == well_id)
    if acknowledged is not None:
        stmt = stmt.where(ThresholdAlert.acknowledged == acknowledged)
    return list(db.execute(stmt).scalars().all())


def get_alert(db: DbSession, alert_id: int) -> ThresholdAlert | None:
    return db.get(ThresholdAlert, alert_id)


def acknowledge_alert(db: DbSession, alert: ThresholdAlert) -> ThresholdAlert:
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return alert


def alerts_since(db: DbSession, since_id: int) -> list[ThresholdAlert]:
    """Used by the SSE stream's poll loop — see api/operations.py."""
    stmt = (
        select(ThresholdAlert)
        .where(ThresholdAlert.id > since_id)
        .order_by(ThresholdAlert.id)
    )
    return list(db.execute(stmt).scalars().all())


def max_alert_id(db: DbSession) -> int:
    result = db.execute(select(ThresholdAlert.id).order_by(ThresholdAlert.id.desc()).limit(1))
    row = result.scalar_one_or_none()
    return row or 0
