import { Alert, Box, CircularProgress } from "@mui/material";
import { usePermission } from "../auth/usePermission";
import { useHealthCheck } from "../api/health";
import { NavBar } from "../components/NavBar";

/**
 * Placeholder landing page. Also serves as the reference pattern for
 * loading/error/success API states and permission-dependent UI that later
 * milestones' components follow (see PLAN.md coverage table).
 */
export function Dashboard() {
  const { data, isLoading, isError } = useHealthCheck();
  const canManageUsers = usePermission("admin:manage_users");

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      {canManageUsers && (
        <Alert severity="info" data-testid="admin-panel-link" sx={{ mb: 2 }}>
          User management is available to your role. (Coming in a later milestone.)
        </Alert>
      )}

      {isLoading && <CircularProgress data-testid="health-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="health-error">
          Could not reach the API.
        </Alert>
      )}

      {data && (
        <Alert severity="success" data-testid="health-ok">
          API status: {data.status}
        </Alert>
      )}
    </Box>
  );
}
