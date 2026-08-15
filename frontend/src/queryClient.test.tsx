import { onlineManager, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  createAppPersister,
  createAppQueryClient,
  PERSIST_MAX_AGE_MS,
  shouldPersistQuery,
} from "./queryClient";

// createSyncStoragePersister throttles writes via a trailing-edge
// setTimeout even when throttleTime is 0 — persistQueryClientSave's promise
// resolves once the write is *scheduled*, not once it's actually flushed to
// storage, so tests need to wait a tick past that for the write to land.
function flushThrottledWrite(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("createAppQueryClient", () => {
  it("uses online network mode and a bounded retry count for queries", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.networkMode).toBe("online");
    expect(defaults.queries?.retry).toBe(2);
  });

  it("keeps mutations online-only, so a failed mutation is never silently auto-retried offline", () => {
    const client = createAppQueryClient();
    expect(client.getDefaultOptions().mutations?.networkMode).toBe("online");
  });
});

describe("shouldPersistQuery", () => {
  it("excludes the auth/me query", () => {
    const client = createAppQueryClient();
    client.setQueryData(["auth", "me"], { id: 1, email: "e@undisputedwell.dev" });
    const [query] = client.getQueryCache().findAll({ queryKey: ["auth", "me"] });

    expect(shouldPersistQuery(query)).toBe(false);
  });

  it("includes other successful queries, e.g. wells", () => {
    const client = createAppQueryClient();
    client.setQueryData(["wells"], { items: [], total: 0 });
    const [query] = client.getQueryCache().findAll({ queryKey: ["wells"] });

    expect(shouldPersistQuery(query)).toBe(true);
  });

  it("excludes queries that haven't succeeded yet", () => {
    const client = createAppQueryClient();
    client.setQueryData(["wells"], { items: [], total: 0 });
    const [query] = client.getQueryCache().findAll({ queryKey: ["wells"] });
    query.reset();

    expect(shouldPersistQuery(query)).toBe(false);
  });
});

describe("persisted cache", () => {
  it("restores a successfully-fetched query's data into a fresh client", async () => {
    const persister = createAppPersister(fakeStorage(), 0);

    const originalClient = createAppQueryClient();
    originalClient.setQueryData(["wells"], { items: [{ id: 1, name: "Well-1" }], total: 1 });
    await persistQueryClientSave({ queryClient: originalClient, persister });
    await flushThrottledWrite();

    const restoredClient = createAppQueryClient();
    await persistQueryClientRestore({
      queryClient: restoredClient,
      persister,
      maxAge: PERSIST_MAX_AGE_MS,
    });

    expect(restoredClient.getQueryData(["wells"])).toEqual({
      items: [{ id: 1, name: "Well-1" }],
      total: 1,
    });
  });

  it("does not restore a persisted cache older than maxAge", async () => {
    const persister = createAppPersister(fakeStorage(), 0);

    const originalClient = createAppQueryClient();
    originalClient.setQueryData(["wells"], { items: [], total: 0 });
    await persistQueryClientSave({ queryClient: originalClient, persister });
    await flushThrottledWrite();

    const restoredClient = createAppQueryClient();
    // A negative maxAge means "already expired" regardless of how recently it was saved.
    await persistQueryClientRestore({ queryClient: restoredClient, persister, maxAge: -1 });

    expect(restoredClient.getQueryData(["wells"])).toBeUndefined();
  });

  it("uses separate storage keys per persister instance, so two app instances don't clobber each other", async () => {
    const persisterA = createAppPersister(fakeStorage(), 0);
    const persisterB = createAppPersister(fakeStorage(), 0);

    const clientA = createAppQueryClient();
    clientA.setQueryData(["wells"], "A");
    await persistQueryClientSave({ queryClient: clientA, persister: persisterA });
    await flushThrottledWrite();

    const restored = createAppQueryClient();
    await persistQueryClientRestore({
      queryClient: restored,
      persister: persisterB,
      maxAge: PERSIST_MAX_AGE_MS,
    });

    expect(restored.getQueryData(["wells"])).toBeUndefined();
  });

  it("never restores auth/me from a persisted snapshot, even when other data round-trips fine", async () => {
    // Regression test for a real bug: without shouldPersistQuery excluding
    // auth/me, a hard navigation shortly after login/logout could restore a
    // stale auth snapshot from before the persister's throttled write had
    // flushed, and ProtectedRoute would redirect based on that stale data
    // instead of ever checking the real session. See queryClient.ts.
    const persister = createAppPersister(fakeStorage(), 0);

    const originalClient = createAppQueryClient();
    originalClient.setQueryData(["auth", "me"], { id: 1, email: "admin@undisputedwell.dev" });
    originalClient.setQueryData(["wells"], { items: [], total: 0 });
    await persistQueryClientSave({
      queryClient: originalClient,
      persister,
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    });
    await flushThrottledWrite();

    const restoredClient = createAppQueryClient();
    await persistQueryClientRestore({
      queryClient: restoredClient,
      persister,
      maxAge: PERSIST_MAX_AGE_MS,
    });

    expect(restoredClient.getQueryData(["auth", "me"])).toBeUndefined();
    expect(restoredClient.getQueryData(["wells"])).toEqual({ items: [], total: 0 });
  });
});

describe("offline/reconnect behavior", () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("serves cached data immediately while offline (fetch paused) and refetches once back online", async () => {
    const client = createAppQueryClient();
    client.setQueryData(["wells"], { items: [], total: 0 });
    client.setQueryDefaults(["wells"], { staleTime: 0 });

    onlineManager.setOnline(false);

    const queryFn = jest
      .fn()
      .mockResolvedValue({ items: [{ id: 1, name: "Well-1" }], total: 1 });

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useQuery({ queryKey: ["wells"], queryFn }), { wrapper });

    expect(result.current.data).toEqual({ items: [], total: 0 });
    expect(result.current.fetchStatus).toBe("paused");
    expect(queryFn).not.toHaveBeenCalled();

    onlineManager.setOnline(true);

    await waitFor(() =>
      expect(result.current.data).toEqual({ items: [{ id: 1, name: "Well-1" }], total: 1 }),
    );
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
