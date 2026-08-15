import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { usePermission } from "../../auth/usePermission";
import {
  useCreateThresholdMutation,
  useDeleteThresholdMutation,
  useThresholdsQuery,
  useUpdateThresholdMutation,
  type ThresholdConfig,
} from "../../api/operations";
import { ThresholdForm } from "./ThresholdForm";

function EditableRow({ threshold }: { threshold: ThresholdConfig }) {
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateThresholdMutation(threshold.id);
  const deleteMutation = useDeleteThresholdMutation();
  const canConfigure = usePermission("threshold:configure");

  if (editing) {
    return (
      <ListItem sx={{ display: "block" }} data-testid={`threshold-edit-${threshold.id}`}>
        <ThresholdForm
          wellId={threshold.well_id}
          initialValues={threshold}
          submitLabel="Save"
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error}
          onSubmit={(values) =>
            updateMutation.mutate(values, { onSuccess: () => setEditing(false) })
          }
        />
        <Button size="small" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </ListItem>
    );
  }

  return (
    <ListItem
      data-testid={`threshold-row-${threshold.id}`}
      secondaryAction={
        canConfigure && (
          <>
            <IconButton size="small" aria-label="Edit threshold" onClick={() => setEditing(true)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Delete threshold"
              onClick={() => deleteMutation.mutate(threshold.id)}
              disabled={deleteMutation.isPending}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )
      }
    >
      <ListItemText
        primary={threshold.metric}
        secondary={`warning: ${threshold.warning_min ?? "—"} / ${threshold.warning_max ?? "—"} · critical: ${threshold.critical_min ?? "—"} / ${threshold.critical_max ?? "—"}`}
      />
    </ListItem>
  );
}

export function ThresholdsPanel({ wellId }: { wellId: number }) {
  const { data, isLoading, isError } = useThresholdsQuery(wellId);
  const createMutation = useCreateThresholdMutation();
  const canConfigure = usePermission("threshold:configure");
  const [addingNew, setAddingNew] = useState(false);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" component="h3">
          Thresholds
        </Typography>
        {canConfigure && !addingNew && (
          <Button size="small" onClick={() => setAddingNew(true)}>
            Add Threshold
          </Button>
        )}
      </Box>

      {isLoading && <CircularProgress data-testid="thresholds-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="thresholds-error">
          Could not load thresholds.
        </Alert>
      )}

      {data && data.items.length === 0 && !addingNew && (
        <Alert severity="info" data-testid="thresholds-empty">
          No thresholds configured for this well.
        </Alert>
      )}

      {data && (
        <List dense>
          {data.items.map((threshold) => (
            <EditableRow key={threshold.id} threshold={threshold} />
          ))}
        </List>
      )}

      {addingNew && (
        <Box sx={{ mt: 1 }} data-testid="threshold-create-form">
          <ThresholdForm
            wellId={wellId}
            submitLabel="Create"
            isSubmitting={createMutation.isPending}
            submitError={createMutation.error}
            onSubmit={(values) =>
              createMutation.mutate(values, { onSuccess: () => setAddingNew(false) })
            }
          />
          <Button size="small" onClick={() => setAddingNew(false)}>
            Cancel
          </Button>
        </Box>
      )}
    </Box>
  );
}
