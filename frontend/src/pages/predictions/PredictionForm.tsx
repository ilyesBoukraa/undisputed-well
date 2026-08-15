import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Grid, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../api/client";
import type { PredictionInput } from "../../api/predictions";

// UI-only shape/range validation, deliberately looser than the backend's
// authoritative Pydantic bounds (see schemas/predictions.py) — the backend
// 422 is still the final word, this is just enough to catch obvious typos
// before a round trip. See PLAN.md validation decision.
const predictionSchema = z.object({
  reservoir_pressure_psi: z.string().min(1, "Required").refine((v) => Number(v) > 0, "Must be positive"),
  reservoir_temperature_f: z.string().min(1, "Required").refine((v) => Number(v) > 32, "Must be above 32°F"),
  api_gravity: z.string().min(1, "Required").refine((v) => Number(v) > 0, "Must be positive"),
  gas_specific_gravity: z.string().min(1, "Required").refine((v) => Number(v) > 0, "Must be positive"),
  solution_gor_scf_stb: z.string().min(1, "Required").refine((v) => Number(v) > 0, "Must be positive"),
  resin_asphaltene_ratio: z.string().min(1, "Required").refine((v) => Number(v) > 0, "Must be positive"),
});

type PredictionFormValues = z.infer<typeof predictionSchema>;

const FIELDS: { name: keyof PredictionFormValues; label: string }[] = [
  { name: "reservoir_pressure_psi", label: "Reservoir pressure (psia)" },
  { name: "reservoir_temperature_f", label: "Reservoir temperature (°F)" },
  { name: "api_gravity", label: "API gravity (°API)" },
  { name: "gas_specific_gravity", label: "Gas specific gravity" },
  { name: "solution_gor_scf_stb", label: "Solution GOR (scf/STB)" },
  { name: "resin_asphaltene_ratio", label: "Resin/asphaltene ratio" },
];

export function PredictionForm({
  wellId,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  wellId: number;
  onSubmit: (values: PredictionInput) => void;
  isSubmitting: boolean;
  submitError: unknown;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      reservoir_pressure_psi: "",
      reservoir_temperature_f: "",
      api_gravity: "",
      gas_specific_gravity: "",
      solution_gor_scf_stb: "",
      resin_asphaltene_ratio: "",
    },
  });

  const errorMessage =
    submitError instanceof ApiError && submitError.status === 422
      ? "Check the input values — one or more is outside an acceptable range."
      : submitError
        ? "Something went wrong. Please try again."
        : null;

  const onValid = (values: PredictionFormValues) =>
    onSubmit({
      well_id: wellId,
      reservoir_pressure_psi: Number(values.reservoir_pressure_psi),
      reservoir_temperature_f: Number(values.reservoir_temperature_f),
      api_gravity: Number(values.api_gravity),
      gas_specific_gravity: Number(values.gas_specific_gravity),
      solution_gor_scf_stb: Number(values.solution_gor_scf_stb),
      resin_asphaltene_ratio: Number(values.resin_asphaltene_ratio),
    });

  return (
    <Box component="form" onSubmit={handleSubmit(onValid)} noValidate>
      <Typography variant="h6" component="h3" gutterBottom>
        Asphaltene Stability Prediction
      </Typography>

      <Grid container spacing={2}>
        {FIELDS.map(({ name, label }) => (
          <Grid key={name} size={{ xs: 12, sm: 6 }}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={label}
                  size="small"
                  fullWidth
                  error={Boolean(errors[name])}
                  helperText={errors[name]?.message}
                />
              )}
            />
          </Grid>
        ))}
      </Grid>

      {errorMessage && (
        <Alert severity="error" data-testid="prediction-form-error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={isSubmitting}>
        {isSubmitting ? "Running…" : "Run Prediction"}
      </Button>
    </Box>
  );
}
