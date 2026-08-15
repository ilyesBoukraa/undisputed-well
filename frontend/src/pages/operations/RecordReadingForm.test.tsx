import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { RecordReadingForm } from "./RecordReadingForm";

function mockAuth() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
  });
}

describe("RecordReadingForm", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a validation error when submitted without a value", async () => {
    const user = userEvent.setup();
    mockAuth();

    renderWithProviders(<RecordReadingForm wellId={5} />);
    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(await screen.findByText("Value is required")).toBeInTheDocument();
  });

  it("rejects a non-numeric value", async () => {
    const user = userEvent.setup();
    mockAuth();

    renderWithProviders(<RecordReadingForm wellId={5} />);
    await user.type(screen.getByLabelText("Value"), "abc");
    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(await screen.findByText("Must be a number")).toBeInTheDocument();
  });

  it("shows the resulting status after a successful submission", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/readings": () =>
        jsonResponse({
          reading: {
            id: 1,
            well_id: 5,
            metric: "pressure",
            value: 150,
            status: "breach",
            recorded_at: "2026-01-01T00:00:00Z",
          },
          alert: {
            id: 1,
            well_id: 5,
            metric: "pressure",
            value: 150,
            severity: "critical",
            acknowledged: false,
            created_at: "2026-01-01T00:00:00Z",
          },
        }),
    });

    renderWithProviders(<RecordReadingForm wellId={5} />);
    await user.type(screen.getByLabelText("Value"), "150");
    await user.click(screen.getByRole("button", { name: "Record" }));

    await waitFor(() => expect(screen.getByTestId("reading-result")).toBeInTheDocument());
    expect(screen.getByText("breach")).toBeInTheDocument();
  });

  it("shows an error state when recording fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/readings": () => jsonResponse({}, { status: 422 }),
    });

    renderWithProviders(<RecordReadingForm wellId={5} />);
    await user.type(screen.getByLabelText("Value"), "150");
    await user.click(screen.getByRole("button", { name: "Record" }));

    await waitFor(() => expect(screen.getByTestId("reading-form-error")).toBeInTheDocument());
  });

  it("clears the value field after a successful submission", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/me": () =>
        jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: [] }),
      "/api/operations/readings": () =>
        jsonResponse({
          reading: {
            id: 1,
            well_id: 5,
            metric: "pressure",
            value: 50,
            status: "normal",
            recorded_at: "2026-01-01T00:00:00Z",
          },
          alert: null,
        }),
    });

    renderWithProviders(<RecordReadingForm wellId={5} />);
    await user.type(screen.getByLabelText("Value"), "50");
    await user.click(screen.getByRole("button", { name: "Record" }));

    await waitFor(() => expect(screen.getByLabelText("Value")).toHaveValue(""));
  });
});
