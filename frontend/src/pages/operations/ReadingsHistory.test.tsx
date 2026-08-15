import { screen, waitFor } from "@testing-library/react";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { ReadingsHistory } from "./ReadingsHistory";

function mockAuth() {
  return {
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
  };
}

describe("ReadingsHistory", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while readings are being fetched", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/operations/readings": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<ReadingsHistory wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("readings-loading")).toBeInTheDocument());
  });

  it("shows an error state when readings fail to load", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/operations/readings": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<ReadingsHistory wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("readings-error")).toBeInTheDocument());
  });

  it("shows an empty state when no readings exist", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/operations/readings": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<ReadingsHistory wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("readings-empty")).toBeInTheDocument());
  });

  it("renders populated readings with their status", async () => {
    mockFetchByPath({
      ...mockAuth(),
      "/api/operations/readings": () =>
        jsonResponse({
          items: [
            {
              id: 1,
              well_id: 5,
              metric: "pressure",
              value: 150,
              status: "breach",
              recorded_at: "2026-01-01T00:00:00Z",
            },
          ],
          total: 1,
        }),
    });

    renderWithProviders(<ReadingsHistory wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("reading-row-1")).toBeInTheDocument());
    expect(screen.getByText("pressure: 150")).toBeInTheDocument();
    expect(screen.getByText("breach")).toBeInTheDocument();
  });
});
