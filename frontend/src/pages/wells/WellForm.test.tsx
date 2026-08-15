import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../api/client";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { WellForm } from "./WellForm";

function mockRigsAndAuth() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["well:edit"] }),
    "/api/rigs": () =>
      jsonResponse({
        items: [{ id: 3, name: "Rig Alpha", location: "North", status: "active", created_at: "2026-01-01T00:00:00Z" }],
        total: 1,
      }),
  });
}

describe("WellForm", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows a validation error when submitted without a name", async () => {
    const user = userEvent.setup();
    mockRigsAndAuth();
    const onSubmit = jest.fn();

    renderWithProviders(
      <WellForm onSubmit={onSubmit} isSubmitting={false} submitError={null} submitLabel="Create Well" />,
    );

    await user.click(screen.getByRole("button", { name: "Create Well" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a negative depth", async () => {
    const user = userEvent.setup();
    mockRigsAndAuth();

    renderWithProviders(
      <WellForm onSubmit={jest.fn()} isSubmitting={false} submitError={null} submitLabel="Create Well" />,
    );

    await user.type(screen.getByLabelText("Name"), "Well-1");
    await user.type(screen.getByLabelText("Depth (m)"), "-5");
    await user.click(screen.getByRole("button", { name: "Create Well" }));

    expect(await screen.findByText("Depth must be a non-negative number")).toBeInTheDocument();
  });

  it("submits with an unassigned rig converted to null", async () => {
    const user = userEvent.setup();
    mockRigsAndAuth();
    const onSubmit = jest.fn();

    renderWithProviders(
      <WellForm onSubmit={onSubmit} isSubmitting={false} submitError={null} submitLabel="Create Well" />,
    );

    await user.type(screen.getByLabelText("Name"), "Well-1");
    await user.click(screen.getByRole("button", { name: "Create Well" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Well-1", rig_id: null, depth_m: null, spud_date: null }),
      ),
    );
  });

  it("lists rigs fetched from the API in the rig select", async () => {
    const user = userEvent.setup();
    mockRigsAndAuth();

    renderWithProviders(
      <WellForm onSubmit={jest.fn()} isSubmitting={false} submitError={null} submitLabel="Create Well" />,
    );

    await user.click(screen.getByRole("combobox", { name: "Rig" }));
    expect(await screen.findByRole("option", { name: "Rig Alpha" })).toBeInTheDocument();
  });

  it("submits full details (depth, spud date, rig) converted to their input types", async () => {
    const user = userEvent.setup();
    mockRigsAndAuth();
    const onSubmit = jest.fn();

    renderWithProviders(
      <WellForm onSubmit={onSubmit} isSubmitting={false} submitError={null} submitLabel="Create Well" />,
    );

    await user.type(screen.getByLabelText("Name"), "Well-1");
    await user.type(screen.getByLabelText("Depth (m)"), "1200");
    await user.type(screen.getByLabelText("Spud date"), "2025-06-01");
    await user.click(screen.getByRole("combobox", { name: "Rig" }));
    await user.click(await screen.findByRole("option", { name: "Rig Alpha" }));
    await user.click(screen.getByRole("button", { name: "Create Well" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Well-1", depth_m: 1200, rig_id: 3 }),
      ),
    );
  });

  it("pre-fills fields from initialValues with a depth and assigned rig", async () => {
    mockRigsAndAuth();

    renderWithProviders(
      <WellForm
        initialValues={{
          id: 1,
          name: "Well-1",
          status: "producing",
          depth_m: 1500,
          spud_date: "2025-06-01",
          rig_id: 3,
          rig: { id: 3, name: "Rig Alpha" },
          created_at: "2026-01-01T00:00:00Z",
        }}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={null}
        submitLabel="Save Changes"
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Well-1");
    expect(screen.getByLabelText("Depth (m)")).toHaveValue(1500);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Rig" })).toHaveTextContent("Rig Alpha"));
  });

  it("shows a generic message for a non-409/422 submit error", async () => {
    mockRigsAndAuth();

    renderWithProviders(
      <WellForm
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(500, "boom")}
        submitLabel="Create Well"
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("well-form-error")).toHaveTextContent(
        "Something went wrong. Please try again.",
      ),
    );
  });

  it("shows a 422 submit error as an invalid-rig message", async () => {
    mockRigsAndAuth();

    renderWithProviders(
      <WellForm
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(422, "bad rig")}
        submitLabel="Create Well"
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("well-form-error")).toHaveTextContent("That rig no longer exists."),
    );
  });
});
