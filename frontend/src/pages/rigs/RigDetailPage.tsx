import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { Panel } from "../../components/Panel";
import { StatusChip } from "../../components/StatusChip";
import { useDeleteRigMutation, useRigQuery } from "../../api/rigs";

export function RigDetailPage() {
  const { rigId } = useParams<{ rigId: string }>();
  const id = Number(rigId);
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: rig, isLoading, isError } = useRigQuery(id);
  const deleteMutation = useDeleteRigMutation();
  const canEdit = usePermission("rig:edit");
  const canDelete = usePermission("rig:delete");

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      {isLoading && <CircularProgress data-testid="rig-detail-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="rig-detail-error">
          Could not load this rig.
        </Alert>
      )}

      {rig && (
        <Panel sx={{ p: 4, maxWidth: 480 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {rig.name}
          </Typography>
          <Typography>Location: {rig.location}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 0.5 }}>
            <Typography>Status:</Typography>
            <StatusChip status={rig.status} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Created {new Date(rig.created_at).toLocaleDateString()}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            {canEdit && (
              <Button component={RouterLink} to={`/rigs/${rig.id}/edit`} variant="outlined">
                Edit
              </Button>
            )}
            {canDelete && !confirmingDelete && (
              <Button color="error" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
            {canDelete && confirmingDelete && (
              <>
                <Button
                  color="error"
                  variant="contained"
                  data-testid="confirm-delete-rig"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(rig.id, {
                      onSuccess: () => navigate("/rigs", { replace: true }),
                    })
                  }
                >
                  {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
              </>
            )}
          </Stack>

          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }} data-testid="rig-delete-error">
              Could not delete this rig.
            </Alert>
          )}
        </Panel>
      )}
    </Box>
  );
}
