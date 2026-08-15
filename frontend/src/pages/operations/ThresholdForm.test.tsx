import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../api/client";
import { ThresholdForm } from "./ThresholdForm";

describe("ThresholdForm", () => {
  it("submits with numeric bands converted and blank bands as null", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <ThresholdForm
        wellId={5}
        onSubmit={onSubmit}
        isSubmitting={false}
        submitError={null}
        submitLabel="Create"
      />,
    );

    await user.type(screen.getByLabelText("Warning max"), "80");
    await user.type(screen.getByLabelText("Critical max"), "100");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      well_id: 5,
      metric: "pressure",
      warning_min: null,
      warning_max: 80,
      critical_min: null,
      critical_max: 100,
    });
  });

  it("rejects a non-numeric band", async () => {
    const user = userEvent.setup();
    render(
      <ThresholdForm
        wellId={5}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={null}
        submitLabel="Create"
      />,
    );

    await user.type(screen.getByLabelText("Warning max"), "not-a-number");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Must be a number")).toBeInTheDocument();
  });

  it("disables the metric field and pre-fills bands when editing", () => {
    render(
      <ThresholdForm
        wellId={5}
        initialValues={{
          id: 1,
          well_id: 5,
          metric: "temperature",
          warning_min: null,
          warning_max: 200,
          critical_min: null,
          critical_max: 250,
          created_at: "2026-01-01T00:00:00Z",
        }}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={null}
        submitLabel="Save"
      />,
    );

    expect(screen.getByLabelText("Metric")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("Warning max")).toHaveValue("200");
  });

  it("shows a conflict message for a 409 submit error", () => {
    render(
      <ThresholdForm
        wellId={5}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(409, "dup")}
        submitLabel="Create"
      />,
    );

    expect(screen.getByTestId("threshold-form-error")).toHaveTextContent(
      "A threshold for this metric already exists on this well.",
    );
  });

  it("shows a Saving state while submitting", () => {
    render(
      <ThresholdForm
        wellId={5}
        onSubmit={jest.fn()}
        isSubmitting
        submitError={null}
        submitLabel="Create"
      />,
    );

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
