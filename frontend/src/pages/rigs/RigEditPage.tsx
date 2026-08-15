import { Alert, Box, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useRigQuery, useUpdateRigMutation } from "../../api/rigs";
import { NavBar } from "../../components/NavBar";
import { RigForm } from "./RigForm";

export function RigEditPage() {
  const { rigId } = useParams<{ rigId: string }>();
  const id = Number(rigId);
  const navigate = useNavigate();

  const { data: rig, isLoading, isError } = useRigQuery(id);
  const updateMutation = useUpdateRigMutation(id);

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      {isLoading && <CircularProgress data-testid="rig-edit-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="rig-edit-error">
          Could not load this rig.
        </Alert>
      )}

      {rig && (
        <RigForm
          initialValues={rig}
          submitLabel="Save Changes"
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error}
          onSubmit={(values) =>
            updateMutation.mutate(values, {
              onSuccess: () => navigate(`/rigs/${id}`, { replace: true }),
            })
          }
        />
      )}
    </Box>
  );
}
