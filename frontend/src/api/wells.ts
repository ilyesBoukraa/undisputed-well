import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type WellStatus = "drilling" | "producing" | "shut_in" | "abandoned";

export interface Well {
  id: number;
  name: string;
  status: WellStatus;
  depth_m: number | null;
  spud_date: string | null;
  rig_id: number | null;
  rig: { id: number; name: string } | null;
  created_at: string;
}

export interface WellFilters {
  q?: string;
  status?: WellStatus | "";
  rig_id?: number;
  sort?: "name" | "created_at" | "status";
  order?: "asc" | "desc";
}

export interface WellInput {
  name: string;
  status: WellStatus;
  depth_m: number | null;
  spud_date: string | null;
  rig_id: number | null;
}

const WELLS_QUERY_KEY = ["wells"] as const;

function buildQuery(filters: WellFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.rig_id !== undefined) params.set("rig_id", String(filters.rig_id));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useWellsQuery(filters: WellFilters = {}) {
  return useQuery({
    queryKey: [...WELLS_QUERY_KEY, filters],
    queryFn: () => apiGet<{ items: Well[]; total: number }>(`/wells${buildQuery(filters)}`),
  });
}

export function useWellQuery(wellId: number | undefined) {
  return useQuery({
    queryKey: [...WELLS_QUERY_KEY, wellId],
    queryFn: () => apiGet<Well>(`/wells/${wellId}`),
    enabled: wellId !== undefined,
  });
}

export function useCreateWellMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WellInput) => apiPost<Well>("/wells", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WELLS_QUERY_KEY });
    },
  });
}

export function useUpdateWellMutation(wellId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WellInput>) => apiPatch<Well>(`/wells/${wellId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WELLS_QUERY_KEY });
    },
  });
}

export function useDeleteWellMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wellId: number) => apiDelete<void>(`/wells/${wellId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WELLS_QUERY_KEY });
    },
  });
}
