import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../api/client";
import type { Rig, RigInput } from "../../api/rigs";

// UI-only shape/required-field validation. FastAPI is the sole authority on
// business rules (e.g. name uniqueness surfaces as a 409, handled below via
// the mutation's error, not re-implemented here). See PLAN.md validation
// decision.
const rigSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  location: z.string().min(1, "Location is required").max(255),
  status: z.enum(["active", "maintenance", "idle"]),
});

export type RigFormValues = z.infer<typeof rigSchema>;

export function RigForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
}: {
  initialValues?: Rig;
  onSubmit: (values: RigInput) => void;
  isSubmitting: boolean;
  submitError: unknown;
  submitLabel: string;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RigFormValues>({
    resolver: zodResolver(rigSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      location: initialValues?.location ?? "",
      status: initialValues?.status ?? "active",
    },
  });

  const errorMessage =
    submitError instanceof ApiError && submitError.status === 409
      ? "A rig with this name already exists."
      : submitError
        ? "Something went wrong. Please try again."
        : null;

  return (
    <Paper sx={{ p: 4, maxWidth: 480 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {submitLabel}
      </Typography>

      <Box component="form" onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Name"
              fullWidth
              margin="normal"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
            />
          )}
        />

        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Location"
              fullWidth
              margin="normal"
              error={Boolean(errors.location)}
              helperText={errors.location?.message}
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Status" fullWidth margin="normal">
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="maintenance">maintenance</MenuItem>
              <MenuItem value="idle">idle</MenuItem>
            </TextField>
          )}
        />

        {errorMessage && (
          <Alert severity="error" data-testid="rig-form-error" sx={{ mt: 1 }}>
            {errorMessage}
          </Alert>
        )}

        <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </Box>
    </Paper>
  );
}
