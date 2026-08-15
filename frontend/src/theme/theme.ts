import { createTheme } from "@mui/material/styles";

/**
 * Central MUI theme. Kept minimal for M0 — extended as later milestones
 * introduce the actual UndisputedWell brand/visual language.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B5FFF" },
  },
});
