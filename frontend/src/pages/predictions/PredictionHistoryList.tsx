import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { usePredictionsQuery, type RiskLevel } from "../../api/predictions";

const RISK_COLOR: Record<RiskLevel, "success" | "warning" | "error"> = {
  stable: "success",
  at_risk: "warning",
  unstable: "error",
};

export function PredictionHistoryList({
  wellId,
  selectedId,
  onSelect,
}: {
  wellId: number;
  selectedId: number | undefined;
  onSelect: (predictionId: number) => void;
}) {
  const { data, isLoading, isError } = usePredictionsQuery(wellId);

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        History
      </Typography>

      {isLoading && <CircularProgress data-testid="prediction-history-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="prediction-history-error">
          Could not load prediction history.
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Alert severity="info" data-testid="prediction-history-empty">
          No predictions run yet for this well.
        </Alert>
      )}

      {data && data.items.length > 0 && (
        <List dense>
          {data.items.map((prediction) => (
            <ListItemButton
              key={prediction.id}
              selected={prediction.id === selectedId}
              onClick={() => onSelect(prediction.id)}
              data-testid={`prediction-history-row-${prediction.id}`}
            >
              <Chip
                size="small"
                label={prediction.risk_level.replace("_", " ")}
                color={RISK_COLOR[prediction.risk_level]}
                sx={{ mr: 1 }}
              />
              <ListItemText
                primary={`Onset: ${prediction.onset_pressure_psi} psia`}
                secondary={new Date(prediction.created_at).toLocaleString()}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
