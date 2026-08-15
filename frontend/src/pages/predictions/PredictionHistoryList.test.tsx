import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { PredictionHistoryList } from "./PredictionHistoryList";

const SUMMARY = {
  id: 1,
  well_id: 5,
  risk_level: "unstable",
  onset_pressure_psi: 3033.18,
  bubble_point_pressure_psi: 2333.22,
  created_at: "2026-01-01T00:00:00Z",
};

function mockAuth() {
  return {
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
  };
}

describe("PredictionHistoryList", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while history is being fetched", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/predictions": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<PredictionHistoryList wellId={5} selectedId={undefined} onSelect={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId("prediction-history-loading")).toBeInTheDocument());
  });

  it("shows an error state when history fails to load", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/predictions": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<PredictionHistoryList wellId={5} selectedId={undefined} onSelect={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId("prediction-history-error")).toBeInTheDocument());
  });

  it("shows an empty state when there is no history", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/predictions": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<PredictionHistoryList wellId={5} selectedId={undefined} onSelect={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId("prediction-history-empty")).toBeInTheDocument());
  });

  it("renders a populated history row and selects it when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    mockFetchByPath({
      ...mockAuth(),
      "/api/predictions": () => jsonResponse({ items: [SUMMARY], total: 1 }),
    });

    renderWithProviders(<PredictionHistoryList wellId={5} selectedId={undefined} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByTestId("prediction-history-row-1")).toBeInTheDocument());
    expect(screen.getByText("unstable")).toBeInTheDocument();

    await user.click(screen.getByTestId("prediction-history-row-1"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
