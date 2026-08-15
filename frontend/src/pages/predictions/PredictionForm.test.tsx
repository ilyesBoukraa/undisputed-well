import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../api/client";
import { PredictionForm } from "./PredictionForm";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Reservoir pressure (psia)"), "4000");
  await user.type(screen.getByLabelText("Reservoir temperature (°F)"), "180");
  await user.type(screen.getByLabelText("API gravity (°API)"), "35");
  await user.type(screen.getByLabelText("Gas specific gravity"), "0.8");
  await user.type(screen.getByLabelText("Solution GOR (scf/STB)"), "600");
  await user.type(screen.getByLabelText("Resin/asphaltene ratio"), "1.5");
}

describe("PredictionForm", () => {
  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<PredictionForm wellId={5} onSubmit={onSubmit} isSubmitting={false} submitError={null} />);

    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(await screen.findAllByText("Required")).toHaveLength(6);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a non-positive pressure", async () => {
    const user = userEvent.setup();
    render(<PredictionForm wellId={5} onSubmit={jest.fn()} isSubmitting={false} submitError={null} />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText("Reservoir pressure (psia)"));
    await user.type(screen.getByLabelText("Reservoir pressure (psia)"), "-10");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(await screen.findByText("Must be positive")).toBeInTheDocument();
  });

  it("submits parsed numeric values with the well id", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<PredictionForm wellId={5} onSubmit={onSubmit} isSubmitting={false} submitError={null} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(onSubmit).toHaveBeenCalledWith({
      well_id: 5,
      reservoir_pressure_psi: 4000,
      reservoir_temperature_f: 180,
      api_gravity: 35,
      gas_specific_gravity: 0.8,
      solution_gor_scf_stb: 600,
      resin_asphaltene_ratio: 1.5,
    });
  });

  it("shows a Running state while submitting", () => {
    render(<PredictionForm wellId={5} onSubmit={jest.fn()} isSubmitting submitError={null} />);

    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
  });

  it("shows a range-check message for a 422 submit error", () => {
    render(
      <PredictionForm
        wellId={5}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(422, "bad input")}
      />,
    );

    expect(screen.getByTestId("prediction-form-error")).toHaveTextContent(
      "Check the input values — one or more is outside an acceptable range.",
    );
  });

  it("shows a generic message for other submit errors", () => {
    render(
      <PredictionForm
        wellId={5}
        onSubmit={jest.fn()}
        isSubmitting={false}
        submitError={new ApiError(500, "boom")}
      />,
    );

    expect(screen.getByTestId("prediction-form-error")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
