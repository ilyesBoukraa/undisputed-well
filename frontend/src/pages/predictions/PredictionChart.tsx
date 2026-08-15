import { Alert, Box, Chip, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import type { Prediction, RiskLevel } from "../../api/predictions";

const RISK_COLOR: Record<RiskLevel, "success" | "warning" | "error"> = {
  stable: "success",
  at_risk: "warning",
  unstable: "error",
};

/**
 * Plots the instability-index-vs-pressure curve from a prediction run. See
 * services/predictions.py for what the curve actually represents — this
 * component just renders whatever curve it's given.
 */
export function PredictionChart({ prediction }: { prediction: Prediction | undefined }) {
  if (!prediction) {
    return (
      <Alert severity="info" data-testid="prediction-chart-empty">
        Run a prediction to see the stability curve.
      </Alert>
    );
  }

  const pressures = prediction.curve.map((point) => point.pressure);
  const instabilityIndices = prediction.curve.map((point) => point.instability_index);

  return (
    <Box data-testid="prediction-chart">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Chip
          label={prediction.risk_level.replace("_", " ")}
          color={RISK_COLOR[prediction.risk_level]}
          data-testid="prediction-risk-chip"
        />
        <Typography variant="body2">
          Bubble point: {prediction.bubble_point_pressure_psi} psia · Onset:{" "}
          {prediction.onset_pressure_psi} psia
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <LineChart
          width={640}
          height={320}
          xAxis={[{ data: pressures, label: "Pressure (psia)", scaleType: "linear" }]}
          yAxis={[{ label: "Instability index", min: 0, max: 1 }]}
          series={[
            {
              data: instabilityIndices,
              label: "Instability index",
              area: true,
              showMark: false,
            },
          ]}
        />
      </Box>
    </Box>
  );
}
