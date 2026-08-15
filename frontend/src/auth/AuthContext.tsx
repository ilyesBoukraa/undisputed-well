import { useIsRestoring, useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import { fetchCurrentUser, type CurrentUser } from "../api/auth";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

interface AuthContextValue {
  user: CurrentUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // While the persisted cache is being restored from storage (see
  // App.tsx/queryClient.ts), TanStack Query holds this query's fetch back —
  // isFetching is false during that window, which makes useQuery's own
  // isLoading (isPending && isFetching) read false too, even though no
  // fetch has actually happened yet. Without folding in isRestoring,
  // ProtectedRoute sees isLoading:false/isAuthenticated:false in that gap
  // and redirects to /login before the real request ever gets to run.
  const isRestoring = useIsRestoring();
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });

  const value: AuthContextValue = {
    user: user ?? null,
    permissions: user?.permissions ?? [],
    isAuthenticated: Boolean(user),
    isLoading: isLoading || isRestoring,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
