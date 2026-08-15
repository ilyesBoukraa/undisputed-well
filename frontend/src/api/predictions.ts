import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";

export type RiskLevel = "stable" | "at_risk" | "unstable";

export interface CurvePoint {
  pressure: number;
  instability_index: number;
}

export interface PredictionInput {
  well_id: number;
  reservoir_pressure_psi: number;
  reservoir_temperature_f: number;
  api_gravity: number;
  gas_specific_gravity: number;
  solution_gor_scf_stb: number;
  resin_asphaltene_ratio: number;
}

export interface Prediction extends PredictionInput {
  id: number;
  bubble_point_pressure_psi: number;
  onset_pressure_psi: number;
  risk_level: RiskLevel;
  curve: CurvePoint[];
  created_at: string;
}

export interface PredictionSummary {
  id: number;
  well_id: number;
  risk_level: RiskLevel;
  onset_pressure_psi: number;
  bubble_point_pressure_psi: number;
  created_at: string;
}

const PREDICTIONS_QUERY_KEY = ["predictions"] as const;

export function usePredictionsQuery(wellId: number | undefined) {
  return useQuery({
    queryKey: [...PREDICTIONS_QUERY_KEY, wellId],
    queryFn: () =>
      apiGet<{ items: PredictionSummary[]; total: number }>(`/predictions?well_id=${wellId}`),
    enabled: wellId !== undefined,
  });
}

export function usePredictionQuery(predictionId: number | undefined) {
  return useQuery({
    queryKey: [...PREDICTIONS_QUERY_KEY, "detail", predictionId],
    queryFn: () => apiGet<Prediction>(`/predictions/${predictionId}`),
    enabled: predictionId !== undefined,
  });
}

export function useCreatePredictionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PredictionInput) => apiPost<Prediction>("/predictions", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PREDICTIONS_QUERY_KEY }),
  });
}
