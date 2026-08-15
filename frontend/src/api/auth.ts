import { ApiError, apiGet, apiPost } from "./client";

export interface CurrentUser {
  id: number;
  email: string;
  role: string;
  permissions: string[];
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  return apiPost<CurrentUser>("/auth/login", { email, password });
}

export async function logout(): Promise<void> {
  await apiPost<{ status: string }>("/auth/logout");
}

/**
 * A 401 here just means "not logged in" — an expected, valid state on app
 * load, not a failure — so it resolves to null rather than throwing. Any
 * other failure (network error, 5xx) is rethrown so callers/TanStack Query
 * can treat it as a real error state.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiGet<CurrentUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
