import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Chip, MenuItem, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateReadingMutation, type Metric, type ReadingStatus } from "../../api/operations";

const readingSchema = z.object({
  metric: z.enum(["pressure", "temperature", "flow_rate"]),
  value: z.string().min(1, "Value is required").refine((v) => !Number.isNaN(Number(v)), {
    message: "Must be a number",
  }),
});

type ReadingFormValues = z.infer<typeof readingSchema>;

const STATUS_COLOR: Record<ReadingStatus, "success" | "warning" | "error"> = {
  normal: "success",
  warning: "warning",
  breach: "error",
};

/**
 * Simulates a sensor reading for a well — there's no real telemetry feed in
 * this project, so this is how engineers/admins exercise the threshold
 * evaluation and alerting pipeline. Not shown to viewers (well:edit gated).
 */
export function RecordReadingForm({ wellId }: { wellId: number }) {
  const createMutation = useCreateReadingMutation();

  const { control, handleSubmit, reset } = useForm<ReadingFormValues>({
    resolver: zodResolver(readingSchema),
    defaultValues: { metric: "pressure", value: "" },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      { well_id: wellId, metric: values.metric as Metric, value: Number(values.value) },
      { onSuccess: () => reset({ metric: values.metric, value: "" }) },
    );
  });

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Record a Reading
      </Typography>
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Controller
          name="metric"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Metric" size="small">
              <MenuItem value="pressure">pressure</MenuItem>
              <MenuItem value="temperature">temperature</MenuItem>
              <MenuItem value="flow_rate">flow_rate</MenuItem>
            </TextField>
          )}
        />
        <Controller
          name="value"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Value"
              size="small"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Button type="submit" size="small" variant="contained" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Recording…" : "Record"}
        </Button>
      </Box>

      {createMutation.isError && (
        <Alert severity="error" data-testid="reading-form-error" sx={{ mt: 1 }}>
          Could not record this reading.
        </Alert>
      )}

      {createMutation.isSuccess && createMutation.data && (
        <Alert
          severity="info"
          data-testid="reading-result"
          sx={{ mt: 1 }}
          icon={false}
        >
          Recorded — status:{" "}
          <Chip
            size="small"
            label={createMutation.data.reading.status}
            color={STATUS_COLOR[createMutation.data.reading.status]}
          />
        </Alert>
      )}
    </Box>
  );
}
