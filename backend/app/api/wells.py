from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.schemas.wells import WellCreate, WellListOut, WellOut, WellUpdate
from app.services.wells import (
    DuplicateWellNameError,
    RigNotFoundError,
    create_well,
    delete_well,
    get_well,
    list_wells,
    update_well,
)

router = APIRouter(prefix="/wells", tags=["wells"])


def _get_well_or_404(db: DbSession, well_id: int):
    well = get_well(db, well_id)
    if well is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Well not found")
    return well


@router.get("", response_model=WellListOut, dependencies=[Depends(require_permission("well:read"))])
def get_wells(
    q: str | None = None,
    status: str | None = None,
    rig_id: int | None = None,
    sort: str = "name",
    order: str = "asc",
    db: DbSession = Depends(get_db),
) -> WellListOut:
    wells = list_wells(db, q=q, status=status, rig_id=rig_id, sort=sort, order=order)
    return WellListOut(items=[WellOut.model_validate(w) for w in wells], total=len(wells))


@router.get(
    "/{well_id}", response_model=WellOut, dependencies=[Depends(require_permission("well:read"))]
)
def get_well_detail(well_id: int, db: DbSession = Depends(get_db)) -> WellOut:
    return WellOut.model_validate(_get_well_or_404(db, well_id))


@router.post(
    "",
    response_model=WellOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("well:edit"))],
)
def create_well_endpoint(payload: WellCreate, db: DbSession = Depends(get_db)) -> WellOut:
    try:
        return WellOut.model_validate(create_well(db, payload))
    except DuplicateWellNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A well with this name already exists"
        ) from exc
    except RigNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rig_id does not refer to an existing rig"
        ) from exc


@router.patch(
    "/{well_id}", response_model=WellOut, dependencies=[Depends(require_permission("well:edit"))]
)
def update_well_endpoint(
    well_id: int, payload: WellUpdate, db: DbSession = Depends(get_db)
) -> WellOut:
    well = _get_well_or_404(db, well_id)
    try:
        return WellOut.model_validate(update_well(db, well, payload))
    except DuplicateWellNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A well with this name already exists"
        ) from exc
    except RigNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rig_id does not refer to an existing rig"
        ) from exc


@router.delete(
    "/{well_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("well:delete"))],
)
def delete_well_endpoint(well_id: int, db: DbSession = Depends(get_db)) -> None:
    well = _get_well_or_404(db, well_id)
    delete_well(db, well)
