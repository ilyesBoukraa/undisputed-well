import { render, screen, waitFor } from "@testing-library/react";
import { App, queryClient } from "./App";
import { jsonResponse, mockFetchByPath } from "./test/renderWithProviders";

// App.tsx owns its own QueryClientProvider/BrowserRouter, so these tests
// render <App/> directly rather than through renderWithProviders (which
// would double up the providers). MemoryRouter isn't used here either —
// BrowserRouter reads the jsdom URL, which defaults to "/".

describe("App shell", () => {
  beforeEach(() => {
    // App.tsx uses BrowserRouter, which reads real jsdom history/location —
    // reset it before each test so a redirect from a previous test (e.g. to
    // /login) doesn't leak into the next one.
    window.history.pushState({}, "", "/");
    // App.tsx's queryClient is a module-level singleton (by design — one
    // client for the app's lifetime), so its cache also has to be reset
    // between tests or a previous test's cached /auth/me result leaks in.
    queryClient.clear();
    // App.tsx now persists the cache to real localStorage (see
    // queryClient.ts) — clear it too, or a persisted result from one test
    // gets restored into the next.
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("redirects an unauthenticated visitor to the login page", async () => {
    mockFetchByPath({
      "/api/auth/me": () => jsonResponse({ detail: "Not authenticated" }, { status: 401 }),
    });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Sign in to UndisputedWell" })).toBeInTheDocument(),
    );
  });

  it("renders the dashboard end to end for an authenticated visitor", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "engineer@undisputedwell.dev", role: "engineer", permissions: ["well:read"] }),
      "/api/health": () => jsonResponse({ status: "ok" }),
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "UndisputedWell" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("health-ok")).toBeInTheDocument());
    expect(screen.getByTestId("current-user")).toHaveTextContent("engineer@undisputedwell.dev");
  });

  it("shows the 404 page for an unmatched route", async () => {
    window.history.pushState({}, "", "/this-route-does-not-exist");
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "engineer@undisputedwell.dev", role: "engineer", permissions: [] }),
    });

    render(<App />);

    expect(await screen.findByText("404")).toBeInTheDocument();
  });
});
