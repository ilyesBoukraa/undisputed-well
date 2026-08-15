import { createTheme, type Theme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

/**
 * Central MUI theme factory. `mode` is supplied by ThemeModeProvider, which
 * also owns picking/persisting light vs dark — this function just turns a
 * mode into a Theme. MUI's `palette.mode: "dark"` already generates sensible
 * background/text/divider defaults; only the brand primary color is pinned
 * explicitly so it stays consistent (and readable — MUI adjusts contrast
 * text against it automatically) across both modes.
 */
export function createAppTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: "#0B5FFF" },
    },
  });
}
