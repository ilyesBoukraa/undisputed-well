import { Box, alpha, useTheme } from "@mui/material";

const DRIFT_KEYFRAMES = {
  "@keyframes blob-drift-a": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "50%": { transform: "translate(4vw, 5vw) scale(1.08)" },
  },
  "@keyframes blob-drift-b": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "50%": { transform: "translate(-5vw, -3vw) scale(1.1)" },
  },
  "@keyframes blob-drift-c": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "50%": { transform: "translate(-3vw, 4vw) scale(0.92)" },
  },
};

const REDUCED_MOTION = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };

/**
 * Three soft, blurred, drifting radial-gradient blobs — one accent-amber,
 * two brand-blue — behind the topographic contours. Purely decorative
 * (`aria-hidden`); colors come from the live theme (via `alpha()`) so they
 * repaint correctly across the light/dark toggle without a re-render of
 * this component's own logic.
 */
export function AuroraBlobs() {
  const theme = useTheme();
  const blue = theme.palette.primary.main;
  const amber = theme.palette.accent.main;

  return (
    <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, overflow: "hidden", ...DRIFT_KEYFRAMES }}>
      <Box
        sx={{
          position: "absolute",
          width: "46vw",
          height: "46vw",
          left: "-10vw",
          top: "-8vw",
          borderRadius: "50%",
          filter: "blur(70px)",
          background: `radial-gradient(circle, ${alpha(blue, 0.85)}, ${alpha(blue, 0)} 70%)`,
          animation: "blob-drift-a 26s ease-in-out infinite",
          ...REDUCED_MOTION,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "38vw",
          height: "38vw",
          right: "-8vw",
          bottom: "-6vw",
          borderRadius: "50%",
          filter: "blur(70px)",
          background: `radial-gradient(circle, ${alpha(amber, 0.7)}, ${alpha(amber, 0)} 70%)`,
          animation: "blob-drift-b 32s ease-in-out infinite",
          ...REDUCED_MOTION,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "26vw",
          height: "26vw",
          right: "8vw",
          top: "6vw",
          borderRadius: "50%",
          filter: "blur(70px)",
          background: `radial-gradient(circle, ${alpha(blue, 0.5)}, ${alpha(blue, 0)} 70%)`,
          animation: "blob-drift-c 22s ease-in-out infinite",
          ...REDUCED_MOTION,
        }}
      />
    </Box>
  );
}
