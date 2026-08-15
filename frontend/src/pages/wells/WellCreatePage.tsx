import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useCreateWellMutation } from "../../api/wells";
import { NavBar } from "../../components/NavBar";
import { WellForm } from "./WellForm";

export function WellCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateWellMutation();

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />
      <WellForm
        submitLabel="Create Well"
        isSubmitting={createMutation.isPending}
        submitError={createMutation.error}
        onSubmit={(values) =>
          createMutation.mutate(values, {
            onSuccess: (well) => navigate(`/wells/${well.id}`, { replace: true }),
          })
        }
      />
    </Box>
  );
}
