import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { Dashboard } from "./Dashboard";

const EMPTY_LIST = { items: [], total: 0 };

function mockAuthenticatedAs(
  permissions: string[],
  overrides: Partial<Record<string, unknown>> = {},
  fleetOverrides: Partial<Record<string, unknown>> = {},
) {
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
    "/api/wells": () => jsonResponse((fleetOverrides.wells as object) ?? EMPTY_LIST),
    "/api/rigs": () => jsonResponse((fleetOverrides.rigs as object) ?? EMPTY_LIST),
    "/api/operations/alerts": () => jsonResponse((fleetOverrides.alerts as object) ?? EMPTY_LIST),
    "/api/predictions": () => jsonResponse((fleetOverrides.predictions as object) ?? EMPTY_LIST),
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
    expect(screen.getByRole("heading", { name: "Fleet at a glance" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("current-user")).toHaveTextContent("engineer@undisputedwell.dev"),
    );
  });

  it("shows a loading state while the health check is in flight", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/health": () => new Promise(() => {}) as unknown as Response,
      "/api/wells": () => jsonResponse(EMPTY_LIST),
      "/api/rigs": () => jsonResponse(EMPTY_LIST),
      "/api/operations/alerts": () => jsonResponse(EMPTY_LIST),
      "/api/predictions": () => jsonResponse(EMPTY_LIST),
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
      "/api/wells": () => jsonResponse(EMPTY_LIST),
      "/api/rigs": () => jsonResponse(EMPTY_LIST),
      "/api/operations/alerts": () => jsonResponse(EMPTY_LIST),
      "/api/predictions": () => jsonResponse(EMPTY_LIST),
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
      "/api/wells": () => jsonResponse(EMPTY_LIST),
      "/api/rigs": () => jsonResponse(EMPTY_LIST),
      "/api/operations/alerts": () => jsonResponse(EMPTY_LIST),
      "/api/predictions": () => jsonResponse(EMPTY_LIST),
    });

    renderWithProviders(<Dashboard />);

    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await user.click(signOutButton);

    expect(await screen.findByRole("button", { name: "Signing out…" })).toBeDisabled();
  });

  // UI2: fleet-wide overview built on the existing list endpoints.
  describe("fleet overview", () => {
    it("shows empty states for every panel when nothing has been created yet", async () => {
      mockAuthenticatedAs(["well:read"]);

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByTestId("recent-alerts-empty")).toBeInTheDocument());
      expect(screen.getByTestId("fleet-status-empty")).toBeInTheDocument();
      expect(screen.getAllByText("0")).not.toHaveLength(0);
    });

    it("summarizes wells, rigs, alerts, and at-risk predictions once data loads", async () => {
      mockAuthenticatedAs(
        ["well:read"],
        {},
        {
          wells: {
            items: [
              { id: 1, name: "Well A", status: "producing" },
              { id: 2, name: "Well B", status: "drilling" },
            ],
            total: 2,
          },
          rigs: {
            items: [{ id: 1, name: "Rig One", location: "Permian Basin", status: "active" }],
            total: 1,
          },
          alerts: {
            items: [
              { id: 1, well_id: 1, metric: "pressure", value: 5000, severity: "critical", acknowledged: false },
            ],
            total: 1,
          },
          predictions: {
            items: [
              { id: 1, well_id: 1, risk_level: "unstable", onset_pressure_psi: 100, bubble_point_pressure_psi: 200 },
              { id: 2, well_id: 2, risk_level: "stable", onset_pressure_psi: 100, bubble_point_pressure_psi: 200 },
            ],
            total: 2,
          },
        },
      );

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByTestId("recent-alert-1")).toBeInTheDocument());
      expect(screen.getByText(/Well A — pressure: 5000/)).toBeInTheDocument();
      expect(screen.getByTestId("fleet-rig-1")).toBeInTheDocument();
      expect(screen.getByText(/Rig One/)).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("shows a loading state on the stat tiles while their queries are in flight", async () => {
      mockFetchByPath({
        "/api/auth/me": () =>
          jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
        "/api/health": () => jsonResponse({ status: "ok" }),
        "/api/wells": () => new Promise(() => {}) as unknown as Response,
        "/api/rigs": () => jsonResponse(EMPTY_LIST),
        "/api/operations/alerts": () => jsonResponse(EMPTY_LIST),
        "/api/predictions": () => jsonResponse(EMPTY_LIST),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByTestId("stat-loading-wells")).toBeInTheDocument());
    });

    it("shows an error state for a panel whose query fails, without blanking the others", async () => {
      mockFetchByPath({
        "/api/auth/me": () =>
          jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
        "/api/health": () => jsonResponse({ status: "ok" }),
        "/api/wells": () => jsonResponse(EMPTY_LIST),
        "/api/rigs": () => jsonResponse({}, { status: 500 }),
        "/api/operations/alerts": () => jsonResponse(EMPTY_LIST),
        "/api/predictions": () => jsonResponse(EMPTY_LIST),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByTestId("fleet-status-error")).toBeInTheDocument());
      expect(screen.getByTestId("recent-alerts-empty")).toBeInTheDocument();
    });

    it("shows an error state for the recent-alerts panel independently, without blanking fleet status", async () => {
      mockFetchByPath({
        "/api/auth/me": () =>
          jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
        "/api/health": () => jsonResponse({ status: "ok" }),
        "/api/wells": () => jsonResponse(EMPTY_LIST),
        "/api/rigs": () =>
          jsonResponse({ items: [{ id: 1, name: "Rig One", location: "Permian Basin", status: "active" }], total: 1 }),
        "/api/operations/alerts": () => jsonResponse({}, { status: 500 }),
        "/api/predictions": () => jsonResponse(EMPTY_LIST),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByTestId("recent-alerts-error")).toBeInTheDocument());
      expect(screen.getByTestId("fleet-rig-1")).toBeInTheDocument();
    });
  });
});
