import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useCreateRigMutation } from "../../api/rigs";
import { NavBar } from "../../components/NavBar";
import { RigForm } from "./RigForm";

export function RigCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateRigMutation();

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />
      <RigForm
        submitLabel="Create Rig"
        isSubmitting={createMutation.isPending}
        submitError={createMutation.error}
        onSubmit={(values) =>
          createMutation.mutate(values, {
            onSuccess: (rig) => navigate(`/rigs/${rig.id}`, { replace: true }),
          })
        }
      />
    </Box>
  );
}
