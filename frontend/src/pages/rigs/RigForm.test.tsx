import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../api/client";
import { RigForm } from "./RigForm";

describe("RigForm", () => {
  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <RigForm
        onSubmit={onSubmit}
        isSubmitting={false}
        submitError={null}
        submitLabel="Create Rig"
      />,
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Create Rig" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the entered values", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <RigForm
        onSubmit={onSubmit}
        isSubmitting={false}
        submitError={null}
        submitLabel="Create Rig"
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Rig Alpha");
    await user.type(screen.getByLabelText("Location"), "North Field");
    await user.click(screen.getByRole("button", { name: "Create Rig" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Rig Alpha", location: "North Field", status: "active" }),
    );
  });

  it("pre-fills fields from initialValues for editing", () => {
    render(
      <RigForm
        initialValues={{
          id: 1,
          name: "Rig Beta",
          location: "South Field",
          status: "maintenance",
          created_at: "2026-01-01T00:00:00Z",
        }}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={null}
        submitLabel="Save Changes"
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Rig Beta");
    expect(screen.getByLabelText("Location")).toHaveValue("South Field");
  });

  it("shows a disabled Saving state while submitting", () => {
    render(
      <RigForm onSubmit={jest.fn()} isSubmitting submitError={null} submitLabel="Create Rig" />,
    );

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("shows a conflict message for a 409 submit error", () => {
    render(
      <RigForm
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(409, "conflict")}
        submitLabel="Create Rig"
      />,
    );

    expect(screen.getByTestId("rig-form-error")).toHaveTextContent(
      "A rig with this name already exists.",
    );
  });

  it("shows a generic message for other submit errors", () => {
    render(
      <RigForm
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(500, "boom")}
        submitLabel="Create Rig"
      />,
    );

    expect(screen.getByTestId("rig-form-error")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
