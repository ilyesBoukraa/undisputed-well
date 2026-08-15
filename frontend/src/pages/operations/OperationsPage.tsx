import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { useWellsQuery } from "../../api/wells";
import { AlertsPanel } from "./AlertsPanel";
import { ReadingsHistory } from "./ReadingsHistory";
import { RecordReadingForm } from "./RecordReadingForm";
import { ThresholdsPanel } from "./ThresholdsPanel";

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wellIdParam = searchParams.get("well_id");
  const wellId = wellIdParam ? Number(wellIdParam) : undefined;
  const canEdit = usePermission("well:edit");

  const { data: wellsData } = useWellsQuery();

  function selectWell(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("well_id", value);
    else next.delete("well_id");
    setSearchParams(next);
  }

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      <Typography variant="h5" component="h2" gutterBottom>
        Operations
      </Typography>

      <AlertsPanel wellId={wellId} />

      <Box sx={{ mt: 4 }}>
        <TextField
          select
          label="Well"
          size="small"
          sx={{ minWidth: 240 }}
          value={wellIdParam ?? ""}
          onChange={(e) => selectWell(e.target.value)}
          data-testid="operations-well-select"
        >
          <MenuItem value="">Select a well…</MenuItem>
          {(wellsData?.items ?? []).map((well) => (
            <MenuItem key={well.id} value={String(well.id)}>
              {well.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {wellId === undefined && (
        <Alert severity="info" data-testid="operations-no-well-selected" sx={{ mt: 2 }}>
          Select a well above to view its thresholds, record a reading, or see its recent
          readings.
        </Alert>
      )}

      {wellId !== undefined && (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 4 }}>
          {canEdit && <RecordReadingForm wellId={wellId} />}
          <ThresholdsPanel wellId={wellId} />
          <ReadingsHistory wellId={wellId} />
        </Box>
      )}
    </Box>
  );
}
