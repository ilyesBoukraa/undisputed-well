import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";

interface HealthResponse {
  status: string;
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthResponse>("/health"),
  });
}
