import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, renderWithProviders } from "../../test/renderWithProviders";
import { ThresholdsPanel } from "./ThresholdsPanel";

const THRESHOLD_1 = {
  id: 1,
  well_id: 5,
  metric: "pressure",
  warning_min: null,
  warning_max: 80,
  critical_min: null,
  critical_max: 100,
  created_at: "2026-01-01T00:00:00Z",
};

function mockFetchByMethod(handlers: Record<string, (init?: RequestInit) => Response>) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = (typeof input === "string" ? input : input.toString()).split("?")[0];
    const method = init?.method ?? "GET";
    const match = Object.entries(handlers).find(([pattern]) => {
      const [patternMethod, patternPath] = pattern.split(" ");
      return patternMethod === method && url === patternPath;
    });
    if (!match) {
      throw new Error(`No mock fetch handler registered for ${method} ${url}`);
    }
    return Promise.resolve(match[1](init));
  }) as jest.Mock;
}

function mockAuth(permissions: string[]) {
  return {
    "GET /api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions }),
  };
}

describe("ThresholdsPanel", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a loading state while thresholds are being fetched", async () => {
    mockFetchByMethod({
      ...mockAuth([]),
      "GET /api/operations/thresholds": () => new Promise(() => {}) as unknown as Response,
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("thresholds-loading")).toBeInTheDocument());
  });

  it("shows an error state when thresholds fail to load", async () => {
    mockFetchByMethod({
      ...mockAuth([]),
      "GET /api/operations/thresholds": () => jsonResponse({}, { status: 500 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("thresholds-error")).toBeInTheDocument());
  });

  it("shows an empty state when no thresholds are configured", async () => {
    mockFetchByMethod({
      ...mockAuth([]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("thresholds-empty")).toBeInTheDocument());
  });

  it("renders a populated threshold row", async () => {
    mockFetchByMethod({
      ...mockAuth([]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [THRESHOLD_1], total: 1 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument());
    expect(screen.getByText("pressure")).toBeInTheDocument();
  });

  it("hides Add Threshold and edit/delete controls for a user without threshold:configure", async () => {
    mockFetchByMethod({
      ...mockAuth(["well:read"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [THRESHOLD_1], total: 1 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);

    await waitFor(() => expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Add Threshold" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit threshold" })).not.toBeInTheDocument();
  });

  it("creates a threshold via the Add Threshold form", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      ...mockAuth(["threshold:configure"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [], total: 0 }),
      "POST /api/operations/thresholds": () => jsonResponse(THRESHOLD_1, { status: 201 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);
    await waitFor(() => expect(screen.getByTestId("thresholds-empty")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add Threshold" }));
    expect(screen.getByTestId("threshold-create-form")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Warning max"), "80");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/operations/thresholds"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("edits a threshold via the inline edit form", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      ...mockAuth(["threshold:configure"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [THRESHOLD_1], total: 1 }),
      "PATCH /api/operations/thresholds/1": () =>
        jsonResponse({ ...THRESHOLD_1, warning_max: 90 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);
    await waitFor(() => expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Edit threshold" }));
    expect(screen.getByTestId("threshold-edit-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/operations/thresholds/1"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("cancels editing without saving", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      ...mockAuth(["threshold:configure"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [THRESHOLD_1], total: 1 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);
    await waitFor(() => expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Edit threshold" }));
    expect(screen.getByTestId("threshold-edit-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("threshold-edit-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument();
  });

  it("cancels adding a new threshold without creating one", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      ...mockAuth(["threshold:configure"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [], total: 0 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);
    await waitFor(() => expect(screen.getByTestId("thresholds-empty")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add Threshold" }));
    expect(screen.getByTestId("threshold-create-form")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("threshold-create-form")).not.toBeInTheDocument();
  });

  it("deletes a threshold via the delete icon", async () => {
    const user = userEvent.setup();
    mockFetchByMethod({
      ...mockAuth(["threshold:configure"]),
      "GET /api/operations/thresholds": () => jsonResponse({ items: [THRESHOLD_1], total: 1 }),
      "DELETE /api/operations/thresholds/1": () => jsonResponse(null, { status: 204 }),
    });

    renderWithProviders(<ThresholdsPanel wellId={5} />);
    await waitFor(() => expect(screen.getByTestId("threshold-row-1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete threshold" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/operations/thresholds/1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
