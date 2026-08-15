"""
Asphaltene stability screening model.

This is a deliberately simple, fully deterministic screening heuristic, not
a validated PVT/thermodynamic simulator (real asphaltene-onset prediction
requires an equation-of-state model such as PC-SAFT or modified
Flory-Huggins fit to lab titration data, which is out of scope here). It
combines one well-known real correlation with one industry rule-of-thumb:

1. Bubble point pressure via Standing's (1947) correlation — a standard,
   widely-taught black-oil PVT correlation:

       Pb = 18.2 * ((Rs / gamma_g)^0.83 * 10^(0.00091*T - 0.0125*API) - 1.4)

   Rs = solution GOR (scf/STB), gamma_g = gas specific gravity, T = degF,
   API = API gravity, Pb in psia.

2. Asphaltenes are typically least stable near the bubble point (the
   liquid's solvency for them is weakest there). A resin/asphaltene (R/A)
   mass ratio below roughly 2 is a commonly cited screening rule-of-thumb
   for elevated instability risk; the onset pressure is modeled as sitting
   above the bubble point by an amount that grows as that ratio falls
   below the reference, and the reported curve is a Gaussian-shaped
   instability bump centered on the onset pressure, swept across the
   depletion path from reservoir pressure down to atmospheric.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models.prediction import Prediction, RiskLevel
from app.models.well import Well
from app.schemas.predictions import PredictionInput

# Rule-of-thumb reference R/A ratio: at or above this, precipitation risk
# from this heuristic alone is treated as negligible.
_STABILITY_REFERENCE_RATIO = 2.0
_MIN_STABILITY_RATIO = 0.05  # floor to avoid division blow-up at R/A -> 0
_ONSET_OFFSET_FACTOR = 0.15  # how far above Pb the onset can be pushed
_CURVE_WIDTH_FRACTION = 0.12  # Gaussian sigma as a fraction of onset pressure
_PEAK_HEIGHT_FACTOR = 0.8
_ATMOSPHERIC_PSIA = 14.7
_CURVE_POINTS = 25

_STABLE_MAX = 0.3
_AT_RISK_MAX = 0.7


class WellNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class CurvePoint:
    pressure: float
    instability_index: float


@dataclass(frozen=True)
class PredictionResult:
    bubble_point_pressure_psi: float
    onset_pressure_psi: float
    risk_level: RiskLevel
    curve: list[CurvePoint]


def bubble_point_pressure(
    *,
    solution_gor_scf_stb: float,
    gas_specific_gravity: float,
    reservoir_temperature_f: float,
    api_gravity: float,
) -> float:
    """Standing's (1947) correlation. Clamped at atmospheric — the
    correlation isn't meaningful below it and extreme low-GOR inputs can
    otherwise drive it negative."""
    ratio = solution_gor_scf_stb / gas_specific_gravity
    exponent = 0.00091 * reservoir_temperature_f - 0.0125 * api_gravity
    pb = 18.2 * (ratio**0.83 * 10**exponent - 1.4)
    return max(pb, _ATMOSPHERIC_PSIA)


def _stability_ratio(resin_asphaltene_ratio: float) -> float:
    return max(resin_asphaltene_ratio / _STABILITY_REFERENCE_RATIO, _MIN_STABILITY_RATIO)


def _onset_pressure(pb: float, resin_asphaltene_ratio: float) -> float:
    ratio = _stability_ratio(resin_asphaltene_ratio)
    return pb * (1 + _ONSET_OFFSET_FACTOR / ratio)


def _peak_height(resin_asphaltene_ratio: float) -> float:
    ratio = _stability_ratio(resin_asphaltene_ratio)
    return min(max(_PEAK_HEIGHT_FACTOR / ratio, 0.0), 1.0)


def _risk_level(max_instability: float) -> RiskLevel:
    if max_instability < _STABLE_MAX:
        return RiskLevel.STABLE
    if max_instability < _AT_RISK_MAX:
        return RiskLevel.AT_RISK
    return RiskLevel.UNSTABLE


def run_prediction(payload: PredictionInput) -> PredictionResult:
    pb = bubble_point_pressure(
        solution_gor_scf_stb=payload.solution_gor_scf_stb,
        gas_specific_gravity=payload.gas_specific_gravity,
        reservoir_temperature_f=payload.reservoir_temperature_f,
        api_gravity=payload.api_gravity,
    )
    onset = _onset_pressure(pb, payload.resin_asphaltene_ratio)
    peak_height = _peak_height(payload.resin_asphaltene_ratio)
    sigma = onset * _CURVE_WIDTH_FRACTION

    high = max(payload.reservoir_pressure_psi, _ATMOSPHERIC_PSIA)
    low = _ATMOSPHERIC_PSIA
    step = (high - low) / (_CURVE_POINTS - 1) if _CURVE_POINTS > 1 else 0.0

    curve: list[CurvePoint] = []
    max_instability = 0.0
    for i in range(_CURVE_POINTS):
        pressure = high - step * i
        instability = peak_height * _gaussian(pressure, onset, sigma)
        max_instability = max(max_instability, instability)
        curve.append(CurvePoint(pressure=round(pressure, 2), instability_index=round(instability, 4)))

    return PredictionResult(
        bubble_point_pressure_psi=round(pb, 2),
        onset_pressure_psi=round(onset, 2),
        risk_level=_risk_level(max_instability),
        curve=curve,
    )


def _gaussian(x: float, mean: float, sigma: float) -> float:
    if sigma <= 0:
        return 0.0
    exponent = -((x - mean) ** 2) / (2 * sigma**2)
    return math.exp(exponent)


def create_prediction(db: DbSession, payload: PredictionInput) -> Prediction:
    if db.get(Well, payload.well_id) is None:
        raise WellNotFoundError(payload.well_id)

    result = run_prediction(payload)

    prediction = Prediction(
        well_id=payload.well_id,
        reservoir_pressure_psi=payload.reservoir_pressure_psi,
        reservoir_temperature_f=payload.reservoir_temperature_f,
        api_gravity=payload.api_gravity,
        gas_specific_gravity=payload.gas_specific_gravity,
        solution_gor_scf_stb=payload.solution_gor_scf_stb,
        resin_asphaltene_ratio=payload.resin_asphaltene_ratio,
        bubble_point_pressure_psi=result.bubble_point_pressure_psi,
        onset_pressure_psi=result.onset_pressure_psi,
        risk_level=result.risk_level.value,
        curve=[{"pressure": p.pressure, "instability_index": p.instability_index} for p in result.curve],
        created_at=datetime.now(timezone.utc),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def list_predictions(db: DbSession, *, well_id: int | None = None) -> list[Prediction]:
    stmt = select(Prediction).order_by(Prediction.created_at.desc())
    if well_id is not None:
        stmt = stmt.where(Prediction.well_id == well_id)
    return list(db.execute(stmt).scalars().all())


def get_prediction(db: DbSession, prediction_id: int) -> Prediction | None:
    return db.get(Prediction, prediction_id)
