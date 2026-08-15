import { Box } from "@mui/material";
import type { BoxProps } from "@mui/material";

/**
 * The bordered, card-style container used throughout the app for grouped
 * content — same visual language as the dashboard's StatTile/RecentAlertsCard
 * and the login card, extended to every other page in UI3. A drop-in
 * replacement for a bare MUI `Paper`: default padding/radius/border can be
 * overridden via `sx` using MUI's array-merge convention, so existing call
 * sites like `sx={{ p: 4, maxWidth: 480 }}` keep working unchanged.
 */
export function Panel({ sx, children, ...rest }: BoxProps) {
  return (
    <Box
      sx={[
        {
          p: 2.5,
          borderRadius: 2.5,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}
