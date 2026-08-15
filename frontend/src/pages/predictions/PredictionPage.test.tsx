import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { PredictionPage } from "./PredictionPage";

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

const PREDICTION = {
  id: 1,
  well_id: 5,
  reservoir_pressure_psi: 4000,
  reservoir_temperature_f: 180,
  api_gravity: 35,
  gas_specific_gravity: 0.8,
  solution_gor_scf_stb: 600,
  resin_asphaltene_ratio: 1.5,
  bubble_point_pressure_psi: 2333.22,
  onset_pressure_psi: 2800.5,
  risk_level: "at_risk",
  curve: [
    { pressure: 4000, instability_index: 0.02 },
    { pressure: 14.7, instability_index: 0.0 },
  ],
  created_at: "2026-01-01T00:00:00Z",
};

function mockBase(permissions: string[]) {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
    "/api/wells": () => jsonResponse({ items: [WELL_1], total: 1 }),
    "/api/predictions": () => jsonResponse({ items: [], total: 0 }),
  });
}

describe("PredictionPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows only the well selector until a well is chosen", async () => {
    mockBase([]);

    renderWithProviders(<PredictionPage />, { route: "/predictions" });

    await waitFor(() => expect(screen.getByTestId("prediction-well-select")).toBeInTheDocument());
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.getByTestId("prediction-no-well-selected")).toBeInTheDocument();
  });

  it("shows the form, chart, and history once a well is selected via the URL", async () => {
    mockBase(["well:edit"]);

    renderWithProviders(<PredictionPage />, { route: "/predictions?well_id=5" });

    expect(await screen.findByText("Asphaltene Stability Prediction")).toBeInTheDocument();
    expect(screen.getByTestId("prediction-chart-empty")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("prediction-history-empty")).toBeInTheDocument());
    expect(screen.queryByTestId("prediction-no-well-selected")).not.toBeInTheDocument();
  });

  it("hides the prediction form for a user without well:edit", async () => {
    mockBase(["well:read"]);

    renderWithProviders(<PredictionPage />, { route: "/predictions?well_id=5" });

    await waitFor(() => expect(screen.getByTestId("prediction-history-empty")).toBeInTheDocument());
    expect(screen.queryByText("Asphaltene Stability Prediction")).not.toBeInTheDocument();
  });

  it("runs a prediction and renders the resulting chart", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = (typeof input === "string" ? input : input.toString()).split("?")[0];
      const method = init?.method ?? "GET";

      if (url === "/api/auth/me") {
        return Promise.resolve(
          jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
        );
      }
      if (url === "/api/wells") {
        return Promise.resolve(jsonResponse({ items: [WELL_1], total: 1 }));
      }
      if (url === "/api/predictions" && method === "POST") {
        return Promise.resolve(jsonResponse(PREDICTION, { status: 201 }));
      }
      if (url === "/api/predictions") {
        return Promise.resolve(jsonResponse({ items: [], total: 0 }));
      }
      if (url === "/api/predictions/1") {
        return Promise.resolve(jsonResponse(PREDICTION));
      }
      throw new Error(`No mock fetch handler registered for ${method} ${url}`);
    }) as jest.Mock;

    renderWithProviders(<PredictionPage />, { route: "/predictions?well_id=5" });
    await screen.findByText("Asphaltene Stability Prediction");

    await user.type(screen.getByLabelText("Reservoir pressure (psia)"), "4000");
    await user.type(screen.getByLabelText("Reservoir temperature (°F)"), "180");
    await user.type(screen.getByLabelText("API gravity (°API)"), "35");
    await user.type(screen.getByLabelText("Gas specific gravity"), "0.8");
    await user.type(screen.getByLabelText("Solution GOR (scf/STB)"), "600");
    await user.type(screen.getByLabelText("Resin/asphaltene ratio"), "1.5");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    await waitFor(() => expect(screen.getByTestId("prediction-chart")).toBeInTheDocument());
    expect(screen.getByTestId("prediction-risk-chip")).toHaveTextContent("at risk");
  });

  it("updates the well selection when a well is chosen from the dropdown", async () => {
    const user = userEvent.setup();
    mockBase(["well:edit"]);

    renderWithProviders(<PredictionPage />, { route: "/predictions" });
    await waitFor(() => expect(screen.getByTestId("prediction-well-select")).toBeInTheDocument());

    await user.click(screen.getByRole("combobox", { name: "Well" }));
    await user.click(await screen.findByRole("option", { name: "Well-1" }));

    await waitFor(() => expect(screen.getByText("Asphaltene Stability Prediction")).toBeInTheDocument());
  });
});
