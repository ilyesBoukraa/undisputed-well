import { createTheme, type Theme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// Module augmentation: a second brand color alongside MUI's built-in
// palette slots (primary/secondary/error/...), and one bespoke typography
// token for the monospace telemetry-caption face. Both are additive — every
// existing `theme.palette.*` / `theme.typography.*` usage keeps working
// unchanged.
declare module "@mui/material/styles" {
  interface Palette {
    /** Amber/copper "instrumentation" accent — gauges, warning lamps,
     * telemetry decoration. Deliberately separate from `warning` (MUI's
     * semantic alert color, already used for threshold bands) so a purely
     * decorative accent never gets confused with a real alert state. */
    accent: Palette["primary"];
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
  }
  interface TypographyVariants {
    /** Not a full Typography variant (no h1-style heading semantics) —
     * just the font-family string for telemetry-style captions
     * (readings, timestamps, small labels), read via
     * `theme.typography.fontFamilyMono`. */
    fontFamilyMono: string;
  }
  interface TypographyVariantsOptions {
    fontFamilyMono?: string;
  }
}

const FONT_DISPLAY = '"Rajdhani", "Helvetica Neue", Arial, sans-serif';
const FONT_BODY = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// Brand blue kept from the pre-redesign theme (continuity); amber/copper
// added as the instrumentation accent. Both get a mode-specific value —
// pulled brighter/lighter in dark mode for contrast against a near-black
// ground, same relationship as the UI0 preview mockup.
const BRAND_BLUE = { light: "#0B5FFF", dark: "#4D94FF" };
const BRAND_AMBER = { light: "#B8720F", dark: "#FFB84D" };

/**
 * Central MUI theme factory. `mode` is supplied by ThemeModeProvider, which
 * also owns picking/persisting light vs dark — this function just turns a
 * mode into a Theme. MUI's `palette.mode: "dark"` already generates sensible
 * background/text/divider defaults; primary/accent are pinned explicitly so
 * brand color stays consistent (and readable — MUI adjusts contrast text
 * against them automatically) across both modes.
 */
export function createAppTheme(mode: PaletteMode): Theme {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? BRAND_BLUE.dark : BRAND_BLUE.light },
      accent: { main: isDark ? BRAND_AMBER.dark : BRAND_AMBER.light },
    },
    typography: {
      fontFamily: FONT_BODY,
      fontFamilyMono: FONT_MONO,
      h1: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h2: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h3: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h4: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h5: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h6: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      button: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: "0.03em",
      },
      overline: {
        fontFamily: FONT_MONO,
        letterSpacing: "0.08em",
      },
    },
  });
}
