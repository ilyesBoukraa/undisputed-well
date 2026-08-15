import { QueryClient, type Query } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";

// Cached data older than this is dropped on rehydrate rather than shown —
// stale-but-plausible is fine after a short connectivity gap at a rig site,
// stale-by-a-week is not.
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * One query client for the app's lifetime (see App.tsx). `networkMode:
 * "online"` (the default, spelled out here deliberately) is what makes a
 * query pause instead of erroring while offline: cached data already in
 * the query cache is still returned immediately (that part is unconditional
 * — networkMode only governs whether a *new* fetch is attempted), and once
 * `onlineManager` reports back online, TanStack Query automatically resumes
 * any paused queries. ("offlineFirst" is a different, narrower thing — it
 * still fires the fetch attempt itself while offline, meant for a
 * service-worker cache that can answer without real network. Our fetches
 * hit the real backend and genuinely fail offline, so "online" is correct
 * here, not "offlineFirst".) Retry uses TanStack Query's default
 * exponential backoff (capped at 30s) — that comes for free from `retry`
 * without needing a custom `retryDelay`.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        networkMode: "online",
        staleTime: 30_000,
      },
      mutations: {
        // Mutations are explicit user actions (submit a form, delete a
        // record) — retrying one automatically after a failure could
        // double-apply it, so mutations only ever run when actually online.
        networkMode: "online",
      },
    },
  });
}

/**
 * localStorage-backed persister for the query cache. Only successful query
 * results are written (see shouldDehydrateQuery below) — in-flight/error
 * states aren't meaningful to restore on a fresh page load.
 */
export function createAppPersister(
  storage: Storage = window.localStorage,
  throttleTime?: number,
): Persister {
  return createSyncStoragePersister({
    storage,
    key: "undisputedwell-query-cache",
    throttleTime,
  });
}

/**
 * Which queries actually get written to localStorage. The auth/me query
 * (queryKey[0] === "auth" — must match AuthContext's AUTH_QUERY_KEY) is
 * deliberately excluded — persisting it caused a real, reproducible bug:
 * a hard navigation shortly after logging in or out could restore a
 * stale auth snapshot from *before* the persister's throttled write had
 * flushed (that write is debounced ~1s; see appPersister below), and
 * useQuery treats restored data as fresh enough per staleTime, so
 * ProtectedRoute would redirect based on that stale snapshot instead of
 * waiting for a real GET /api/auth/me. Auth state is cheap to revalidate
 * and its actual source of truth is the session cookie, not this cache —
 * persisting it bought nothing but this race. Everything else (wells,
 * rigs, operations, predictions) doesn't have this problem: showing
 * briefly-stale business data while revalidating is the whole point of
 * the persisted-cache decision, not a bug.
 */
export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === "success" && query.queryKey[0] !== "auth";
}

/**
 * One persister instance for the app's lifetime, shared between App.tsx
 * (which feeds it to PersistQueryClientProvider) and useLogoutMutation
 * (which calls removeClient() on it directly). That direct call matters:
 * the persister's own auto-persist-on-change subscription is throttled
 * (~1s by default), so relying on it alone leaves a window where a stale,
 * still-authenticated snapshot sits in localStorage right after logout —
 * real enough to reproduce by logging out and immediately hard-navigating
 * (see e2e/auth.spec.ts), not just a theoretical race.
 */
export const appPersister = createAppPersister();
