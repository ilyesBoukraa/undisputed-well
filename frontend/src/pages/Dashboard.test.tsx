import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../test/renderWithProviders";
import { Dashboard } from "./Dashboard";

function mockAuthenticatedAs(permissions: string[], overrides: Partial<Record<string, unknown>> = {}) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({
        id: 1,
        email: "engineer@undisputedwell.dev",
        role: "engineer",
        permissions,
        ...overrides,
      }),
    "/api/health": () => jsonResponse({ status: "ok" }),
    "/api/auth/logout": () => jsonResponse({ status: "ok" }),
  });
}

describe("Dashboard", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders the page heading and current user once authenticated", async () => {
    mockAuthenticatedAs(["well:read"]);

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole("heading", { name: "UndisputedWell" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("current-user")).toHaveTextContent("engineer@undisputedwell.dev"),
    );
  });

  it("shows a loading state while the health check is in flight", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/health": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByTestId("health-loading")).toBeInTheDocument());
  });

  it("shows a success state once the health check responds", async () => {
    mockAuthenticatedAs(["well:read"]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByTestId("health-ok")).toBeInTheDocument());
    expect(screen.getByText(/API status: ok/)).toBeInTheDocument();
  });

  it("shows an error state when the API is unreachable", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/health": () => jsonResponse({}, { status: 503 }),
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByTestId("health-error")).toBeInTheDocument());
  });

  it("shows the admin panel notice only for a user with admin:manage_users", async () => {
    mockAuthenticatedAs(["admin:manage_users", "well:read"]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByTestId("admin-panel-link")).toBeInTheDocument());
  });

  it("hides the admin panel notice for a user without admin:manage_users", async () => {
    mockAuthenticatedAs(["well:read"]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByTestId("current-user")).toBeInTheDocument());
    expect(screen.queryByTestId("admin-panel-link")).not.toBeInTheDocument();
  });

  it("signs the user out when the sign-out button is clicked", async () => {
    const user = userEvent.setup();
    mockAuthenticatedAs(["well:read"]);

    renderWithProviders(<Dashboard />);

    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await user.click(signOutButton);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/logout"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows a signing-out loading state while the logout request is in flight", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/health": () => jsonResponse({ status: "ok" }),
      "/api/auth/logout": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<Dashboard />);

    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await user.click(signOutButton);

    expect(await screen.findByRole("button", { name: "Signing out…" })).toBeDisabled();
  });
});
