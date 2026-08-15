from datetime import datetime

from pydantic import BaseModel, Field

from app.models.prediction import RiskLevel


class PredictionInput(BaseModel):
    well_id: int
    reservoir_pressure_psi: float = Field(gt=0)
    reservoir_temperature_f: float = Field(gt=32, lt=400)
    api_gravity: float = Field(gt=0, lt=100)
    gas_specific_gravity: float = Field(gt=0, lt=3)
    solution_gor_scf_stb: float = Field(gt=0)
    resin_asphaltene_ratio: float = Field(gt=0)


class CurvePoint(BaseModel):
    pressure: float
    instability_index: float


class PredictionOut(BaseModel):
    id: int
    well_id: int
    reservoir_pressure_psi: float
    reservoir_temperature_f: float
    api_gravity: float
    gas_specific_gravity: float
    solution_gor_scf_stb: float
    resin_asphaltene_ratio: float
    bubble_point_pressure_psi: float
    onset_pressure_psi: float
    risk_level: RiskLevel
    curve: list[CurvePoint]
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictionSummaryOut(BaseModel):
    id: int
    well_id: int
    risk_level: RiskLevel
    onset_pressure_psi: float
    bubble_point_pressure_psi: float
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictionListOut(BaseModel):
    items: list[PredictionSummaryOut]
    total: int
