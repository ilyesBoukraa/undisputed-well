from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.schemas.rigs import RigCreate, RigListOut, RigOut, RigUpdate
from app.services.rigs import (
    DuplicateRigNameError,
    create_rig,
    delete_rig,
    get_rig,
    list_rigs,
    update_rig,
)

router = APIRouter(prefix="/rigs", tags=["rigs"])


def _get_rig_or_404(db: DbSession, rig_id: int):
    rig = get_rig(db, rig_id)
    if rig is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rig not found")
    return rig


@router.get("", response_model=RigListOut, dependencies=[Depends(require_permission("rig:read"))])
def get_rigs(
    q: str | None = None,
    status: str | None = None,
    sort: str = "name",
    order: str = "asc",
    db: DbSession = Depends(get_db),
) -> RigListOut:
    rigs = list_rigs(db, q=q, status=status, sort=sort, order=order)
    return RigListOut(items=[RigOut.model_validate(r) for r in rigs], total=len(rigs))


@router.get(
    "/{rig_id}", response_model=RigOut, dependencies=[Depends(require_permission("rig:read"))]
)
def get_rig_detail(rig_id: int, db: DbSession = Depends(get_db)) -> RigOut:
    return RigOut.model_validate(_get_rig_or_404(db, rig_id))


@router.post(
    "",
    response_model=RigOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("rig:edit"))],
)
def create_rig_endpoint(payload: RigCreate, db: DbSession = Depends(get_db)) -> RigOut:
    try:
        return RigOut.model_validate(create_rig(db, payload))
    except DuplicateRigNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A rig with this name already exists"
        ) from exc


@router.patch(
    "/{rig_id}", response_model=RigOut, dependencies=[Depends(require_permission("rig:edit"))]
)
def update_rig_endpoint(
    rig_id: int, payload: RigUpdate, db: DbSession = Depends(get_db)
) -> RigOut:
    rig = _get_rig_or_404(db, rig_id)
    try:
        return RigOut.model_validate(update_rig(db, rig, payload))
    except DuplicateRigNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A rig with this name already exists"
        ) from exc


@router.delete(
    "/{rig_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("rig:delete"))],
)
def delete_rig_endpoint(rig_id: int, db: DbSession = Depends(get_db)) -> None:
    rig = _get_rig_or_404(db, rig_id)
    delete_rig(db, rig)
