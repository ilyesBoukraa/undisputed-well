import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type Metric = "pressure" | "temperature" | "flow_rate";
export type ReadingStatus = "normal" | "warning" | "breach";
export type AlertSeverity = "warning" | "critical";

export interface ThresholdConfig {
  id: number;
  well_id: number;
  metric: Metric;
  warning_min: number | null;
  warning_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
  created_at: string;
}

export interface ThresholdConfigInput {
  well_id: number;
  metric: Metric;
  warning_min: number | null;
  warning_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
}

export interface Reading {
  id: number;
  well_id: number;
  metric: Metric;
  value: number;
  status: ReadingStatus;
  recorded_at: string;
}

export interface Alert {
  id: number;
  well_id: number;
  metric: Metric;
  value: number;
  severity: AlertSeverity;
  acknowledged: boolean;
  created_at: string;
}

const THRESHOLDS_QUERY_KEY = ["thresholds"] as const;
const READINGS_QUERY_KEY = ["readings"] as const;
const ALERTS_QUERY_KEY = ["alerts"] as const;

export function useThresholdsQuery(wellId: number | undefined) {
  return useQuery({
    queryKey: [...THRESHOLDS_QUERY_KEY, wellId],
    queryFn: () =>
      apiGet<{ items: ThresholdConfig[]; total: number }>(
        `/operations/thresholds?well_id=${wellId}`,
      ),
    enabled: wellId !== undefined,
  });
}

export function useCreateThresholdMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ThresholdConfigInput) => apiPost<ThresholdConfig>("/operations/thresholds", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THRESHOLDS_QUERY_KEY }),
  });
}

export function useUpdateThresholdMutation(thresholdId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ThresholdConfigInput>) =>
      apiPatch<ThresholdConfig>(`/operations/thresholds/${thresholdId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THRESHOLDS_QUERY_KEY }),
  });
}

export function useDeleteThresholdMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (thresholdId: number) => apiDelete<void>(`/operations/thresholds/${thresholdId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THRESHOLDS_QUERY_KEY }),
  });
}

export function useReadingsQuery(wellId: number | undefined) {
  return useQuery({
    queryKey: [...READINGS_QUERY_KEY, wellId],
    queryFn: () => apiGet<{ items: Reading[]; total: number }>(`/operations/readings?well_id=${wellId}`),
    enabled: wellId !== undefined,
  });
}

export function useCreateReadingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { well_id: number; metric: Metric; value: number }) =>
      apiPost<{ reading: Reading; alert: Alert | null }>("/operations/readings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: READINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useAlertsQuery(filters: { wellId?: number; acknowledged?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.wellId !== undefined) params.set("well_id", String(filters.wellId));
  if (filters.acknowledged !== undefined) params.set("acknowledged", String(filters.acknowledged));
  const query = params.toString();

  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, filters],
    queryFn: () => apiGet<{ items: Alert[]; total: number }>(`/operations/alerts${query ? `?${query}` : ""}`),
  });
}

export function useAcknowledgeAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => apiPost<Alert>(`/operations/alerts/${alertId}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}
