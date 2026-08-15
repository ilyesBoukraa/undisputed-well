from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import require_permission
from app.db.session import get_db
from app.schemas.predictions import (
    PredictionInput,
    PredictionListOut,
    PredictionOut,
    PredictionSummaryOut,
)
from app.services.predictions import (
    WellNotFoundError,
    create_prediction,
    get_prediction,
    list_predictions,
)

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post(
    "",
    response_model=PredictionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("well:edit"))],
)
def create_prediction_endpoint(payload: PredictionInput, db: DbSession = Depends(get_db)) -> PredictionOut:
    try:
        return PredictionOut.model_validate(create_prediction(db, payload))
    except WellNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="well_id does not refer to an existing well",
        ) from exc


@router.get(
    "",
    response_model=PredictionListOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def get_predictions(well_id: int | None = None, db: DbSession = Depends(get_db)) -> PredictionListOut:
    predictions = list_predictions(db, well_id=well_id)
    return PredictionListOut(
        items=[PredictionSummaryOut.model_validate(p) for p in predictions], total=len(predictions)
    )


@router.get(
    "/{prediction_id}",
    response_model=PredictionOut,
    dependencies=[Depends(require_permission("well:read"))],
)
def get_prediction_detail(prediction_id: int, db: DbSession = Depends(get_db)) -> PredictionOut:
    prediction = get_prediction(db, prediction_id)
    if prediction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return PredictionOut.model_validate(prediction)
