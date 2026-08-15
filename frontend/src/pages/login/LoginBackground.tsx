import { Box, useTheme } from "@mui/material";
import { AuroraBlobs } from "./AuroraBlobs";
import { TopographicContours } from "./TopographicContours";

/**
 * Fixed full-viewport decorative layer behind the login card: a radial
 * ground wash, aurora blobs, then topographic contours on top. `zIndex: 0`
 * with the login page's content stack at `zIndex: 1` keeps it strictly
 * behind interactive elements and out of the tab order (it's also
 * `aria-hidden` two levels down, in the blob/contour components themselves).
 */
export function LoginBackground() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        background:
          theme.palette.mode === "dark"
            ? `radial-gradient(ellipse 90% 60% at 50% -10%, ${theme.palette.background.paper}, ${theme.palette.background.default})`
            : `radial-gradient(ellipse 90% 60% at 50% -10%, #e3e8ee, ${theme.palette.background.default})`,
      }}
    >
      <AuroraBlobs />
      <TopographicContours />
    </Box>
  );
}
