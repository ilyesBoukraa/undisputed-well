import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth";
import { AUTH_QUERY_KEY } from "./AuthContext";

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (user) => {
      // Seed the cache directly instead of just invalidating — avoids an
      // extra round trip and a loading flicker right after a successful login.
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });
}
