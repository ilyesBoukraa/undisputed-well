import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installFakeEventSource, jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { OperationsPage } from "./OperationsPage";

const WELL_1 = {
  id: 5,
  name: "Well-1",
  status: "producing",
  depth_m: null,
  spud_date: null,
  rig_id: null,
  rig: null,
  created_at: "2026-01-01T00:00:00Z",
};

function mockBase(permissions: string[]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
    "/api/operations/alerts": () => jsonResponse({ items: [], total: 0 }),
    "/api/wells": () => jsonResponse({ items: [WELL_1], total: 1 }),
    "/api/operations/thresholds": () => jsonResponse({ items: [], total: 0 }),
    "/api/operations/readings": () => jsonResponse({ items: [], total: 0 }),
  });
}

describe("OperationsPage", () => {
  beforeEach(() => {
    installFakeEventSource();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders the alerts panel and a well selector", async () => {
    mockBase([]);

    renderWithProviders(<OperationsPage />, { route: "/operations" });

    await waitFor(() => expect(screen.getByTestId("alerts-empty")).toBeInTheDocument());
    expect(screen.getByTestId("operations-well-select")).toBeInTheDocument();
    expect(screen.queryByText("Thresholds")).not.toBeInTheDocument();
    expect(screen.getByTestId("operations-no-well-selected")).toBeInTheDocument();
  });

  it("shows the thresholds panel once a well is selected via the URL", async () => {
    mockBase(["well:edit"]);

    renderWithProviders(<OperationsPage />, { route: "/operations?well_id=5" });

    expect(await screen.findByText("Record a Reading")).toBeInTheDocument();
    expect(screen.getByText("Thresholds")).toBeInTheDocument();
    expect(screen.queryByTestId("operations-no-well-selected")).not.toBeInTheDocument();
  });

  it("hides the record-reading form for a user without well:edit", async () => {
    mockBase(["well:read"]);

    renderWithProviders(<OperationsPage />, { route: "/operations?well_id=5" });

    await waitFor(() => expect(screen.getByTestId("current-user")).toBeInTheDocument());
    expect(screen.getByText("Thresholds")).toBeInTheDocument();
    expect(screen.queryByText("Record a Reading")).not.toBeInTheDocument();
  });

  it("updates the well selection when a well is chosen from the dropdown", async () => {
    const user = userEvent.setup();
    mockBase(["well:edit"]);

    renderWithProviders(<OperationsPage />, { route: "/operations" });
    await waitFor(() => expect(screen.getByTestId("operations-well-select")).toBeInTheDocument());

    await user.click(screen.getByRole("combobox", { name: "Well" }));
    await user.click(await screen.findByRole("option", { name: "Well-1" }));

    await waitFor(() => expect(screen.getByText("Thresholds")).toBeInTheDocument());
  });
});
