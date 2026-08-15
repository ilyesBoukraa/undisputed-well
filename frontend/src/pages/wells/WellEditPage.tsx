import { Alert, Box, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useUpdateWellMutation, useWellQuery } from "../../api/wells";
import { NavBar } from "../../components/NavBar";
import { WellForm } from "./WellForm";

export function WellEditPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const id = Number(wellId);
  const navigate = useNavigate();

  const { data: well, isLoading, isError } = useWellQuery(id);
  const updateMutation = useUpdateWellMutation(id);

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      {isLoading && <CircularProgress data-testid="well-edit-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="well-edit-error">
          Could not load this well.
        </Alert>
      )}

      {well && (
        <WellForm
          initialValues={well}
          submitLabel="Save Changes"
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error}
          onSubmit={(values) =>
            updateMutation.mutate(values, {
              onSuccess: () => navigate(`/wells/${id}`, { replace: true }),
            })
          }
        />
      )}
    </Box>
  );
}
