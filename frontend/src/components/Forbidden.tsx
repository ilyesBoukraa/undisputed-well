import { Alert, Box } from "@mui/material";
import { NavBar } from "./NavBar";

/** Shown when an authenticated user hits a route their role has no permission for. */
export function Forbidden() {
  return (
    <Box sx={{ p: 4 }}>
      <NavBar />
      <Alert severity="warning" data-testid="forbidden-notice">
        You don't have permission to view this page.
      </Alert>
    </Box>
  );
}
