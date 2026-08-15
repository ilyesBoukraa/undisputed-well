import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Tooltip } from "@mui/material";
import type { IconButtonProps } from "@mui/material";
import { useThemeMode } from "../theme/ThemeModeProvider";

/**
 * Light/dark toggle button. Extracted from NavBar (UI0) so the login page
 * (UI1 — today only the authenticated NavBar had a toggle, leaving an
 * unauthenticated visitor stuck with whatever the OS preference resolved
 * to) can offer the exact same control, with the same accessible name and
 * behavior, instead of a second hand-rolled copy.
 */
export function ThemeModeToggle(props: IconButtonProps) {
  const { mode, toggleMode } = useThemeMode();
  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={toggleMode}
        aria-label={label}
        data-testid="theme-mode-toggle"
        {...props}
      >
        {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
