import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../api/client";
import { useRigsQuery } from "../../api/rigs";
import { Panel } from "../../components/Panel";
import type { Well, WellInput } from "../../api/wells";

// UI-only shape validation (required/format/range) — FastAPI/Pydantic remains
// the sole business-rule authority (name uniqueness -> 409, invalid rig_id ->
// 422, both surfaced via the mutation error below). See PLAN.md.
const wellSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  status: z.enum(["drilling", "producing", "shut_in", "abandoned"]),
  depth_m: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Depth must be a non-negative number",
    }),
  spud_date: z.string(),
  rig_id: z.string(),
});

export type WellFormValues = z.infer<typeof wellSchema>;

function toInput(values: WellFormValues): WellInput {
  return {
    name: values.name,
    status: values.status,
    depth_m: values.depth_m === "" ? null : Number(values.depth_m),
    spud_date: values.spud_date === "" ? null : values.spud_date,
    rig_id: values.rig_id === "" ? null : Number(values.rig_id),
  };
}

export function WellForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel,
}: {
  initialValues?: Well;
  onSubmit: (values: WellInput) => void;
  isSubmitting: boolean;
  submitError: unknown;
  submitLabel: string;
}) {
  const { data: rigsData } = useRigsQuery();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WellFormValues>({
    resolver: zodResolver(wellSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      status: initialValues?.status ?? "drilling",
      depth_m: initialValues?.depth_m != null ? String(initialValues.depth_m) : "",
      spud_date: initialValues?.spud_date ?? "",
      rig_id: initialValues?.rig_id != null ? String(initialValues.rig_id) : "",
    },
  });

  const errorMessage =
    submitError instanceof ApiError && submitError.status === 409
      ? "A well with this name already exists."
      : submitError instanceof ApiError && submitError.status === 422
        ? "That rig no longer exists."
        : submitError
          ? "Something went wrong. Please try again."
          : null;

  return (
    <Panel sx={{ p: 4, maxWidth: 480 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {submitLabel}
      </Typography>

      <Box component="form" onSubmit={handleSubmit((values) => onSubmit(toInput(values)))} noValidate>
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
          name="status"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Status" fullWidth margin="normal">
              <MenuItem value="drilling">drilling</MenuItem>
              <MenuItem value="producing">producing</MenuItem>
              <MenuItem value="shut_in">shut_in</MenuItem>
              <MenuItem value="abandoned">abandoned</MenuItem>
            </TextField>
          )}
        />

        <Controller
          name="depth_m"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Depth (m)"
              type="number"
              fullWidth
              margin="normal"
              error={Boolean(errors.depth_m)}
              helperText={errors.depth_m?.message}
            />
          )}
        />

        <Controller
          name="spud_date"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Spud date"
              type="date"
              fullWidth
              margin="normal"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
        />

        <Controller
          name="rig_id"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Rig" fullWidth margin="normal">
              <MenuItem value="">Unassigned</MenuItem>
              {(rigsData?.items ?? []).map((rig) => (
                <MenuItem key={rig.id} value={String(rig.id)}>
                  {rig.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        {errorMessage && (
          <Alert severity="error" data-testid="well-form-error" sx={{ mt: 1 }}>
            {errorMessage}
          </Alert>
        )}

        <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </Box>
    </Panel>
  );
}
