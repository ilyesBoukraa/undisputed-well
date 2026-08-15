import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { Panel } from "../../components/Panel";
import { StatusChip } from "../../components/StatusChip";
import { useDeleteWellMutation, useWellQuery } from "../../api/wells";

export function WellDetailPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const id = Number(wellId);
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: well, isLoading, isError } = useWellQuery(id);
  const deleteMutation = useDeleteWellMutation();
  const canEdit = usePermission("well:edit");
  const canDelete = usePermission("well:delete");

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      {isLoading && <CircularProgress data-testid="well-detail-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="well-detail-error">
          Could not load this well.
        </Alert>
      )}

      {well && (
        <Panel sx={{ p: 4, maxWidth: 480 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {well.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 0.5 }}>
            <Typography>Status:</Typography>
            <StatusChip status={well.status} />
          </Box>
          <Typography>Depth: {well.depth_m ?? "—"} m</Typography>
          <Typography>Spud date: {well.spud_date ?? "—"}</Typography>
          <Typography>
            Rig:{" "}
            {well.rig ? (
              <RouterLink to={`/rigs/${well.rig.id}`}>{well.rig.name}</RouterLink>
            ) : (
              "Unassigned"
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Created {new Date(well.created_at).toLocaleDateString()}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            {canEdit && (
              <Button component={RouterLink} to={`/wells/${well.id}/edit`} variant="outlined">
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
                  data-testid="confirm-delete-well"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(well.id, {
                      onSuccess: () => navigate("/wells", { replace: true }),
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
            <Alert severity="error" sx={{ mt: 2 }} data-testid="well-delete-error">
              Could not delete this well.
            </Alert>
          )}
        </Panel>
      )}
    </Box>
  );
}
