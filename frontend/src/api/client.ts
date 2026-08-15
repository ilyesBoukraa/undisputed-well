import { CSRF_HEADER_NAME, readCsrfToken } from "./csrf";

/**
 * Thin fetch wrapper for calling FastAPI through the same-origin Nginx proxy
 * (see /nginx/nginx.conf — /api/* is proxied to the backend). Because the app
 * is served same-origin, no base URL or CORS handling is needed here; the
 * session cookie is attached automatically by the browser.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status} ${response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: "same-origin" });
  return parseJsonOrThrow<T>(response);
}

async function mutate<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      // Mutating request — the backend's CSRF middleware requires this to
      // match the (non-httpOnly) csrf cookie. See PLAN.md CSRF decision.
      [CSRF_HEADER_NAME]: readCsrfToken() ?? "",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseJsonOrThrow<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return mutate<T>("POST", path, body);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return mutate<T>("PATCH", path, body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return mutate<T>("DELETE", path);
}
