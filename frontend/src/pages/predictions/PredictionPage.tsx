import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { useWellsQuery } from "../../api/wells";
import { useCreatePredictionMutation, usePredictionQuery } from "../../api/predictions";
import { PredictionChart } from "./PredictionChart";
import { PredictionForm } from "./PredictionForm";
import { PredictionHistoryList } from "./PredictionHistoryList";

export function PredictionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wellIdParam = searchParams.get("well_id");
  const wellId = wellIdParam ? Number(wellIdParam) : undefined;
  const canEdit = usePermission("well:edit");

  const { data: wellsData } = useWellsQuery();
  const [selectedPredictionId, setSelectedPredictionId] = useState<number | undefined>(undefined);
  const { data: selectedPrediction } = usePredictionQuery(selectedPredictionId);
  const createMutation = useCreatePredictionMutation();

  function selectWell(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("well_id", value);
    else next.delete("well_id");
    setSearchParams(next);
    setSelectedPredictionId(undefined);
  }

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      <Typography variant="h5" component="h2" gutterBottom>
        Asphaltene Prediction
      </Typography>

      <TextField
        select
        label="Well"
        size="small"
        sx={{ minWidth: 240, mb: 3 }}
        value={wellIdParam ?? ""}
        onChange={(e) => selectWell(e.target.value)}
        data-testid="prediction-well-select"
      >
        <MenuItem value="">Select a well…</MenuItem>
        {(wellsData?.items ?? []).map((well) => (
          <MenuItem key={well.id} value={String(well.id)}>
            {well.name}
          </MenuItem>
        ))}
      </TextField>

      {wellId === undefined && (
        <Alert severity="info" data-testid="prediction-no-well-selected">
          Select a well above to run a prediction or view its history.
        </Alert>
      )}

      {wellId !== undefined && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {canEdit && (
            <PredictionForm
              wellId={wellId}
              isSubmitting={createMutation.isPending}
              submitError={createMutation.error}
              onSubmit={(values) =>
                createMutation.mutate(values, {
                  onSuccess: (prediction) => setSelectedPredictionId(prediction.id),
                })
              }
            />
          )}

          <PredictionChart prediction={selectedPrediction} />

          <PredictionHistoryList
            wellId={wellId}
            selectedId={selectedPredictionId}
            onSelect={setSelectedPredictionId}
          />
        </Box>
      )}
    </Box>
  );
}
