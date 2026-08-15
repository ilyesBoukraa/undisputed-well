import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

/**
 * Catch-all for unmatched routes (see App.tsx's `path="*"`). Deliberately
 * doesn't render NavBar/assume an authenticated session — this route can be
 * hit before auth resolves (e.g. an unauthenticated visitor mistyping a
 * URL), and ProtectedRoute/RequirePermission already handle every *known*
 * protected path correctly; this only ever catches paths that don't exist
 * at all.
 */
export function NotFound() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="body1" gutterBottom>
          This page doesn't exist.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>
          Back to UndisputedWell
        </Button>
      </Box>
    </Box>
  );
}
