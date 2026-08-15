import { render, screen } from "@testing-library/react";
import type { Prediction } from "../../api/predictions";
import { PredictionChart } from "./PredictionChart";

const PREDICTION: Prediction = {
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
    { pressure: 2000, instability_index: 0.5 },
    { pressure: 14.7, instability_index: 0.0 },
  ],
  created_at: "2026-01-01T00:00:00Z",
};

describe("PredictionChart", () => {
  it("shows an empty state when there is no prediction yet", () => {
    render(<PredictionChart prediction={undefined} />);

    expect(screen.getByTestId("prediction-chart-empty")).toBeInTheDocument();
  });

  it("renders the chart, risk chip, and summary values for a populated prediction", () => {
    render(<PredictionChart prediction={PREDICTION} />);

    expect(screen.getByTestId("prediction-chart")).toBeInTheDocument();
    expect(screen.getByTestId("prediction-risk-chip")).toHaveTextContent("at risk");
    expect(screen.getByText(/Bubble point: 2333.22 psia/)).toBeInTheDocument();
    expect(screen.getByText(/Onset: 2800.5 psia/)).toBeInTheDocument();
  });

  it("renders an svg chart element with a stable prediction", () => {
    render(<PredictionChart prediction={{ ...PREDICTION, risk_level: "stable" }} />);

    expect(screen.getByTestId("prediction-risk-chip")).toHaveTextContent("stable");
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("renders for an unstable prediction", () => {
    render(<PredictionChart prediction={{ ...PREDICTION, risk_level: "unstable" }} />);

    expect(screen.getByTestId("prediction-risk-chip")).toHaveTextContent("unstable");
  });
});
