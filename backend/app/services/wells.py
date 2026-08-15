from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession, joinedload

from app.models.rig import Rig
from app.models.well import Well
from app.schemas.wells import WellCreate, WellUpdate

_SORT_COLUMNS = {
    "name": Well.name,
    "created_at": Well.created_at,
    "status": Well.status,
}


class DuplicateWellNameError(Exception):
    pass


class RigNotFoundError(Exception):
    pass


def list_wells(
    db: DbSession,
    *,
    q: str | None = None,
    status: str | None = None,
    rig_id: int | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[Well]:
    stmt = select(Well).options(joinedload(Well.rig))
    if q:
        stmt = stmt.where(Well.name.ilike(f"%{q}%"))
    if status:
        stmt = stmt.where(Well.status == status)
    if rig_id is not None:
        stmt = stmt.where(Well.rig_id == rig_id)

    column = _SORT_COLUMNS.get(sort, Well.name)
    stmt = stmt.order_by(column.desc() if order == "desc" else column.asc())

    return list(db.execute(stmt).unique().scalars().all())


def get_well(db: DbSession, well_id: int) -> Well | None:
    stmt = select(Well).options(joinedload(Well.rig)).where(Well.id == well_id)
    return db.execute(stmt).unique().scalar_one_or_none()


def _assert_rig_exists(db: DbSession, rig_id: int | None) -> None:
    if rig_id is not None and db.get(Rig, rig_id) is None:
        raise RigNotFoundError(rig_id)


def create_well(db: DbSession, payload: WellCreate) -> Well:
    existing = db.execute(select(Well).where(Well.name == payload.name)).scalar_one_or_none()
    if existing is not None:
        raise DuplicateWellNameError(payload.name)
    _assert_rig_exists(db, payload.rig_id)

    well = Well(
        name=payload.name,
        status=payload.status.value,
        depth_m=payload.depth_m,
        spud_date=payload.spud_date,
        rig_id=payload.rig_id,
    )
    db.add(well)
    db.commit()
    return get_well(db, well.id)  # type: ignore[return-value]


def update_well(db: DbSession, well: Well, payload: WellUpdate) -> Well:
    updates = payload.model_dump(exclude_unset=True)

    new_name = updates.get("name")
    if new_name is not None and new_name != well.name:
        existing = db.execute(select(Well).where(Well.name == new_name)).scalar_one_or_none()
        if existing is not None:
            raise DuplicateWellNameError(new_name)
        well.name = new_name

    if "status" in updates and updates["status"] is not None:
        status_value = updates["status"]
        well.status = status_value.value if hasattr(status_value, "value") else status_value
    if "depth_m" in updates:
        well.depth_m = updates["depth_m"]
    if "spud_date" in updates:
        well.spud_date = updates["spud_date"]
    if "rig_id" in updates:
        _assert_rig_exists(db, updates["rig_id"])
        well.rig_id = updates["rig_id"]

    db.commit()
    return get_well(db, well.id)  # type: ignore[return-value]


def delete_well(db: DbSession, well: Well) -> None:
    db.delete(well)
    db.commit()
