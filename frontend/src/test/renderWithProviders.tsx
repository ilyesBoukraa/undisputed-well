import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";

/**
 * Shared test render helper: wraps a component in the same provider stack
 * App.tsx uses (query client, theme, router, auth), so component tests
 * exercise the real integration rather than a hand-rolled subset of it.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeModeProvider>
          <MemoryRouter initialEntries={[route]}>
            <AuthProvider>{ui}</AuthProvider>
          </MemoryRouter>
        </ThemeModeProvider>
      </QueryClientProvider>,
    ),
  };
}

/** Mocks global.fetch to respond per-path, matching on the request URL. */
export function mockFetchByPath(handlers: Record<string, () => Promise<Response> | Response>) {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const match = Object.entries(handlers).find(([path]) => url.includes(path));
    if (!match) {
      throw new Error(`No mock fetch handler registered for ${url}`);
    }
    return Promise.resolve(match[1]());
  }) as jest.Mock;
}

export function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.status === 401 ? "Unauthorized" : "OK",
    json: async () => body,
  } as Response;
}

/** Minimal fake for the browser's EventSource, used by anything rendering useAlertStream. */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

/** Installs FakeEventSource as global.EventSource and resets its instance list. */
export function installFakeEventSource() {
  FakeEventSource.instances = [];
  (global as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
}
