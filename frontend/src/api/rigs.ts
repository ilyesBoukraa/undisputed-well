import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type RigStatus = "active" | "maintenance" | "idle";

export interface Rig {
  id: number;
  name: string;
  location: string;
  status: RigStatus;
  created_at: string;
}

export interface RigFilters {
  q?: string;
  status?: RigStatus | "";
  sort?: "name" | "created_at";
  order?: "asc" | "desc";
}

export interface RigInput {
  name: string;
  location: string;
  status: RigStatus;
}

const RIGS_QUERY_KEY = ["rigs"] as const;

function buildQuery(filters: RigFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useRigsQuery(filters: RigFilters = {}) {
  return useQuery({
    queryKey: [...RIGS_QUERY_KEY, filters],
    queryFn: () => apiGet<{ items: Rig[]; total: number }>(`/rigs${buildQuery(filters)}`),
  });
}

export function useRigQuery(rigId: number | undefined) {
  return useQuery({
    queryKey: [...RIGS_QUERY_KEY, rigId],
    queryFn: () => apiGet<Rig>(`/rigs/${rigId}`),
    enabled: rigId !== undefined,
  });
}

export function useCreateRigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RigInput) => apiPost<Rig>("/rigs", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIGS_QUERY_KEY });
    },
  });
}

export function useUpdateRigMutation(rigId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RigInput>) => apiPatch<Rig>(`/rigs/${rigId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIGS_QUERY_KEY });
    },
  });
}

export function useDeleteRigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rigId: number) => apiDelete<void>(`/rigs/${rigId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIGS_QUERY_KEY });
    },
  });
}
