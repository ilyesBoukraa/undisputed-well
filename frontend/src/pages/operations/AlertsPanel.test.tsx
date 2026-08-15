import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FakeEventSource,
  installFakeEventSource,
  jsonResponse,
  mockFetchByPath,
  renderWithProviders,
} from "../../test/renderWithProviders";
import { AlertsPanel } from "./AlertsPanel";

const ALERT_1 = {
  id: 1,
  well_id: 5,
  metric: "pressure",
  value: 150,
  severity: "critical",
  acknowledged: false,
  created_at: "2026-01-01T00:00:00Z",
};

function mockAuthAndAlerts(alerts: unknown[] = [ALERT_1]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
    "/api/operations/alerts": () => jsonResponse({ items: alerts, total: alerts.length }),
  });
}

describe("AlertsPanel", () => {
  beforeEach(() => {
    installFakeEventSource();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while alerts are being fetched", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/alerts": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<AlertsPanel />);

    await waitFor(() => expect(screen.getByTestId("alerts-loading")).toBeInTheDocument());
  });

  it("shows an error state when alerts fail to load", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/alerts": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<AlertsPanel />);

    await waitFor(() => expect(screen.getByTestId("alerts-error")).toBeInTheDocument());
  });

  it("shows an empty state when there are no active alerts", async () => {
    mockAuthAndAlerts([]);

    renderWithProviders(<AlertsPanel />);

    await waitFor(() => expect(screen.getByTestId("alerts-empty")).toBeInTheDocument());
  });

  it("renders a populated alert with its severity", async () => {
    mockAuthAndAlerts();

    renderWithProviders(<AlertsPanel />);

    await waitFor(() => expect(screen.getByTestId("alert-1")).toBeInTheDocument());
    expect(screen.getByText(/Well #5 — pressure: 150/)).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders a warning-severity alert with a warning MUI severity", async () => {
    mockAuthAndAlerts([{ ...ALERT_1, id: 2, severity: "warning" }]);

    renderWithProviders(<AlertsPanel />);

    await waitFor(() => expect(screen.getByTestId("alert-2")).toBeInTheDocument());
    expect(screen.getByTestId("alert-2")).toHaveClass("MuiAlert-colorWarning");
  });

  it("dismisses an alert when Dismiss is clicked", async () => {
    const user = userEvent.setup();
    mockAuthAndAlerts();

    renderWithProviders(<AlertsPanel />);
    await waitFor(() => expect(screen.getByTestId("alert-1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/operations/alerts/1/acknowledge"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows connecting status before the stream opens, then live once open", async () => {
    mockAuthAndAlerts([]);

    renderWithProviders(<AlertsPanel />);
    await waitFor(() => expect(screen.getByTestId("alerts-empty")).toBeInTheDocument());

    expect(screen.getByTestId("alert-stream-status")).toHaveTextContent("connecting");

    FakeEventSource.instances[0].onopen?.();

    await waitFor(() => expect(screen.getByTestId("alert-stream-status")).toHaveTextContent("live"));
  });

  it("merges a new alert delivered over the stream into the list", async () => {
    mockAuthAndAlerts([]);

    renderWithProviders(<AlertsPanel />);
    await waitFor(() => expect(screen.getByTestId("alerts-empty")).toBeInTheDocument());

    FakeEventSource.instances[0].onmessage?.({ data: JSON.stringify(ALERT_1) });

    await waitFor(() => expect(screen.getByTestId("alert-1")).toBeInTheDocument());
  });

  it("does not duplicate an alert the stream re-delivers", async () => {
    mockAuthAndAlerts();

    renderWithProviders(<AlertsPanel />);
    await waitFor(() => expect(screen.getByTestId("alert-1")).toBeInTheDocument());

    FakeEventSource.instances[0].onmessage?.({ data: JSON.stringify(ALERT_1) });

    await waitFor(() => expect(screen.getAllByTestId("alert-1")).toHaveLength(1));
  });

  it("ignores a streamed alert for a different well when filtered to a specific well", async () => {
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/alerts": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<AlertsPanel wellId={999} />);
    await waitFor(() => expect(screen.getByTestId("alerts-empty")).toBeInTheDocument());

    FakeEventSource.instances[0].onmessage?.({ data: JSON.stringify(ALERT_1) });

    expect(screen.queryByTestId("alert-1")).not.toBeInTheDocument();
  });
});
