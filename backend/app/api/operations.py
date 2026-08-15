import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_current_user, require_permission
from app.db.session import get_db, get_sessionmaker
from app.schemas.operations import (
    AlertListOut,
    AlertOut,
    ReadingCreate,
    ReadingCreateResponse,
    ReadingListOut,
    ReadingOut,
    ThresholdConfigCreate,
    ThresholdConfigListOut,
    ThresholdConfigOut,
    ThresholdConfigUpdate,
)
from app.services.operations import (
    DuplicateThresholdError,
    WellNotFoundError,
    acknowledge_alert,
    alerts_since,
    create_reading,
    create_threshold,
    delete_threshold,
    get_alert,
    get_threshold,
    list_alerts,
    list_readings,
    list_thresholds,
    max_alert_id,
    update_threshold,
)

router = APIRouter(prefix="/operations", tags=["operations"])

# How often the SSE stream re-polls for new alerts. A plain synchronous
# SQLAlchemy Session held open for a whole connection's lifetime is awkward
# (sessions aren't meant to be long-lived, and the app has no async DB driver
# set up), so the stream instead opens a short-lived session on each poll
# tick — simple, testable, and avoids threading a queue/broadcaster across
# the sync/async boundary for what is, for this project's scale, an
# acceptably small amount of added latency. See PLAN.md M3.
_POLL_INTERVAL_SECONDS = 1.0
# A ": comment\n\n" line is a valid no-op SSE frame — sent periodically so
# intermediaries (nginx's proxy_read_timeout, browsers) see steady activity
# on an otherwise-quiet connection instead of treating it as stalled/dead.
_HEARTBEAT_EVERY_N_POLLS = 15


@router.post(
    "/readings",
    response_model=ReadingCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("well:edit"))],
)
def create_reading_endpoint(
    payload: ReadingCreate, db: DbSession = Depends(get_db)
) -> ReadingCreateResponse:
    try:
        reading, alert = create_reading(db, payload)
    except WellNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="well_id does not refer to an existing well",
        ) from exc
    return ReadingCreateResponse(
        reading=ReadingOut.model_validate(reading),
        alert=AlertOut.model_validate(alert) if alert else None,
    )


@router.get(
    "/readings",
    response_model=ReadingListOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def get_readings(
    well_id: int | None = None, metric: str | None = None, db: DbSession = Depends(get_db)
) -> ReadingListOut:
    readings = list_readings(db, well_id=well_id, metric=metric)
    return ReadingListOut(items=[ReadingOut.model_validate(r) for r in readings], total=len(readings))


@router.get(
    "/thresholds",
    response_model=ThresholdConfigListOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def get_thresholds(well_id: int | None = None, db: DbSession = Depends(get_db)) -> ThresholdConfigListOut:
    thresholds = list_thresholds(db, well_id=well_id)
    return ThresholdConfigListOut(
        items=[ThresholdConfigOut.model_validate(t) for t in thresholds], total=len(thresholds)
    )


@router.post(
    "/thresholds",
    response_model=ThresholdConfigOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("threshold:configure"))],
)
def create_threshold_endpoint(
    payload: ThresholdConfigCreate, db: DbSession = Depends(get_db)
) -> ThresholdConfigOut:
    try:
        return ThresholdConfigOut.model_validate(create_threshold(db, payload))
    except WellNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="well_id does not refer to an existing well",
        ) from exc
    except DuplicateThresholdError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A threshold config for this well and metric already exists",
        ) from exc


def _get_threshold_or_404(db: DbSession, threshold_id: int):
    threshold = get_threshold(db, threshold_id)
    if threshold is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threshold config not found")
    return threshold


@router.patch(
    "/thresholds/{threshold_id}",
    response_model=ThresholdConfigOut,
    dependencies=[Depends(require_permission("threshold:configure"))],
)
def update_threshold_endpoint(
    threshold_id: int, payload: ThresholdConfigUpdate, db: DbSession = Depends(get_db)
) -> ThresholdConfigOut:
    threshold = _get_threshold_or_404(db, threshold_id)
    return ThresholdConfigOut.model_validate(update_threshold(db, threshold, payload))


@router.delete(
    "/thresholds/{threshold_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("threshold:configure"))],
)
def delete_threshold_endpoint(threshold_id: int, db: DbSession = Depends(get_db)) -> None:
    threshold = _get_threshold_or_404(db, threshold_id)
    delete_threshold(db, threshold)


@router.get(
    "/alerts",
    response_model=AlertListOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def get_alerts(
    well_id: int | None = None,
    acknowledged: bool | None = None,
    db: DbSession = Depends(get_db),
) -> AlertListOut:
    alerts = list_alerts(db, well_id=well_id, acknowledged=acknowledged)
    return AlertListOut(items=[AlertOut.model_validate(a) for a in alerts], total=len(alerts))


@router.post(
    "/alerts/{alert_id}/acknowledge",
    response_model=AlertOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def acknowledge_alert_endpoint(alert_id: int, db: DbSession = Depends(get_db)) -> AlertOut:
    alert = get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return AlertOut.model_validate(acknowledge_alert(db, alert))


@router.get("/alerts/stream")
async def stream_alerts(
    request: Request,
    since_id: int | None = None,
    _user=Depends(get_current_user),
    sessionmaker=Depends(get_sessionmaker),
) -> StreamingResponse:
    """
    text/event-stream of newly created ThresholdAlerts. Each event carries an
    `id:` field, so a browser EventSource's automatic reconnect sends it back
    as `Last-Event-ID` and resumes without gaps or duplicates — the standard
    SSE resume mechanism, preferred over the `since_id` query param (which
    remains as a fallback for the first connection / non-browser clients).
    Omitting both starts the stream from "now" (only alerts created after
    connecting) so a fresh dashboard load isn't flooded with history — use
    GET /alerts for the initial snapshot.
    """

    def _resolve_resume_point() -> int | None:
        last_event_id = request.headers.get("last-event-id")
        if last_event_id is not None:
            try:
                return int(last_event_id)
            except ValueError:
                pass
        return since_id

    def _snapshot_max_id() -> int:
        db = sessionmaker()
        try:
            return max_alert_id(db)
        finally:
            db.close()

    def _poll(last_id: int):
        db = sessionmaker()
        try:
            return alerts_since(db, last_id)
        finally:
            db.close()

    async def event_generator():
        resume_point = _resolve_resume_point()
        last_id = resume_point if resume_point is not None else await asyncio.to_thread(_snapshot_max_id)
        # Flush something immediately so the connection is visibly "open" to
        # the client (and any buffering intermediary) right away rather than
        # only after the first alert or the first heartbeat.
        yield ": connected\n\n"
        polls_since_heartbeat = 0
        while True:
            if await request.is_disconnected():
                break
            new_alerts = await asyncio.to_thread(_poll, last_id)
            if new_alerts:
                polls_since_heartbeat = 0
                for alert in new_alerts:
                    last_id = alert.id
                    payload = AlertOut.model_validate(alert).model_dump(mode="json")
                    yield f"id: {alert.id}\ndata: {json.dumps(payload)}\n\n"
            else:
                polls_since_heartbeat += 1
                if polls_since_heartbeat >= _HEARTBEAT_EVERY_N_POLLS:
                    polls_since_heartbeat = 0
                    yield ": heartbeat\n\n"
            await asyncio.sleep(_POLL_INTERVAL_SECONDS)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
