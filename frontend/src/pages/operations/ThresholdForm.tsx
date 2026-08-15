import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../api/client";
import type { Metric, ThresholdConfig, ThresholdConfigInput } from "../../api/operations";

const numberField = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Must be a number" });

const thresholdSchema = z.object({
  metric: z.enum(["pressure", "temperature", "flow_rate"]),
  warning_min: numberField,
  warning_max: numberField,
  critical_min: numberField,
  critical_max: numberField,
});

export type ThresholdFormValues = z.infer<typeof thresholdSchema>;

function toBand(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function ThresholdForm({
  wellId,
  initialValues,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
}: {
  wellId: number;
  initialValues?: ThresholdConfig;
  onSubmit: (values: ThresholdConfigInput) => void;
  isSubmitting: boolean;
  submitError: unknown;
  submitLabel: string;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ThresholdFormValues>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      metric: initialValues?.metric ?? "pressure",
      warning_min: initialValues?.warning_min != null ? String(initialValues.warning_min) : "",
      warning_max: initialValues?.warning_max != null ? String(initialValues.warning_max) : "",
      critical_min: initialValues?.critical_min != null ? String(initialValues.critical_min) : "",
      critical_max: initialValues?.critical_max != null ? String(initialValues.critical_max) : "",
    },
  });

  const errorMessage =
    submitError instanceof ApiError && submitError.status === 409
      ? "A threshold for this metric already exists on this well."
      : submitError
        ? "Something went wrong. Please try again."
        : null;

  const onValid = (values: ThresholdFormValues) =>
    onSubmit({
      well_id: wellId,
      metric: values.metric as Metric,
      warning_min: toBand(values.warning_min),
      warning_max: toBand(values.warning_max),
      critical_min: toBand(values.critical_min),
      critical_max: toBand(values.critical_max),
    });

  return (
    <Box component="form" onSubmit={handleSubmit(onValid)} noValidate>
      <Controller
        name="metric"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Metric"
            size="small"
            fullWidth
            margin="dense"
            disabled={Boolean(initialValues)}
          >
            <MenuItem value="pressure">pressure</MenuItem>
            <MenuItem value="temperature">temperature</MenuItem>
            <MenuItem value="flow_rate">flow_rate</MenuItem>
          </TextField>
        )}
      />

      <Stack direction="row" spacing={1}>
        <Controller
          name="warning_min"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Warning min"
              size="small"
              margin="dense"
              error={Boolean(errors.warning_min)}
              helperText={errors.warning_min?.message}
            />
          )}
        />
        <Controller
          name="warning_max"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Warning max"
              size="small"
              margin="dense"
              error={Boolean(errors.warning_max)}
              helperText={errors.warning_max?.message}
            />
          )}
        />
      </Stack>

      <Stack direction="row" spacing={1}>
        <Controller
          name="critical_min"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Critical min"
              size="small"
              margin="dense"
              error={Boolean(errors.critical_min)}
              helperText={errors.critical_min?.message}
            />
          )}
        />
        <Controller
          name="critical_max"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Critical max"
              size="small"
              margin="dense"
              error={Boolean(errors.critical_max)}
              helperText={errors.critical_max?.message}
            />
          )}
        />
      </Stack>

      {errorMessage && (
        <Alert severity="error" data-testid="threshold-form-error" sx={{ mt: 1 }}>
          {errorMessage}
        </Alert>
      )}

      <Button type="submit" size="small" variant="contained" sx={{ mt: 1 }} disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </Box>
  );
}
