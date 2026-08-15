import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLogoutMutation } from "../auth/useLogoutMutation";
import { useThemeMode } from "../theme/ThemeModeProvider";

/**
 * Shared header/nav used by every authenticated page. Factored out of the
 * original Dashboard header (M1) so M2's list/detail pages get the same
 * chrome and navigation without duplicating the sign-out wiring.
 */
export function NavBar() {
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const { mode, toggleMode } = useThemeMode();

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <Typography variant="h4" component="h1">
          UndisputedWell
        </Typography>
        <Box component="nav" sx={{ display: "flex", gap: 1 }}>
          <Button component={RouterLink} to="/" size="small">
            Dashboard
          </Button>
          <Button component={RouterLink} to="/rigs" size="small">
            Rigs
          </Button>
          <Button component={RouterLink} to="/wells" size="small">
            Wells
          </Button>
          <Button component={RouterLink} to="/operations" size="small">
            Operations
          </Button>
          <Button component={RouterLink} to="/predictions" size="small">
            Predictions
          </Button>
          <Button component={RouterLink} to="/assistant" size="small">
            Assistant
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {user && (
          <Typography variant="body2" data-testid="current-user">
            {user.email} ({user.role})
          </Typography>
        )}
        <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton
            size="small"
            onClick={toggleMode}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="theme-mode-toggle"
          >
            {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button
          variant="outlined"
          size="small"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </Box>
    </Box>
  );
}
