from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models.rig import Rig
from app.schemas.rigs import RigCreate, RigUpdate

_SORT_COLUMNS = {
    "name": Rig.name,
    "created_at": Rig.created_at,
}


class DuplicateRigNameError(Exception):
    pass


def list_rigs(
    db: DbSession,
    *,
    q: str | None = None,
    status: str | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[Rig]:
    stmt = select(Rig)
    if q:
        stmt = stmt.where(Rig.name.ilike(f"%{q}%"))
    if status:
        stmt = stmt.where(Rig.status == status)

    column = _SORT_COLUMNS.get(sort, Rig.name)
    stmt = stmt.order_by(column.desc() if order == "desc" else column.asc())

    return list(db.execute(stmt).scalars().all())


def get_rig(db: DbSession, rig_id: int) -> Rig | None:
    return db.get(Rig, rig_id)


def create_rig(db: DbSession, payload: RigCreate) -> Rig:
    existing = db.execute(select(Rig).where(Rig.name == payload.name)).scalar_one_or_none()
    if existing is not None:
        raise DuplicateRigNameError(payload.name)

    rig = Rig(name=payload.name, location=payload.location, status=payload.status.value)
    db.add(rig)
    db.commit()
    db.refresh(rig)
    return rig


def update_rig(db: DbSession, rig: Rig, payload: RigUpdate) -> Rig:
    updates = payload.model_dump(exclude_unset=True)

    new_name = updates.get("name")
    if new_name is not None and new_name != rig.name:
        existing = db.execute(select(Rig).where(Rig.name == new_name)).scalar_one_or_none()
        if existing is not None:
            raise DuplicateRigNameError(new_name)
        rig.name = new_name

    if "location" in updates:
        rig.location = updates["location"]
    if "status" in updates and updates["status"] is not None:
        rig.status = updates["status"].value if hasattr(updates["status"], "value") else updates["status"]

    db.commit()
    db.refresh(rig)
    return rig


def delete_rig(db: DbSession, rig: Rig) -> None:
    db.delete(rig)
    db.commit()
