import { Box, useTheme } from "@mui/material";
import {
  CONTOUR_TRACK_1,
  CONTOUR_TRACK_2,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  samplePolylinePoints,
} from "./contourPoints";

const SCROLL_KEYFRAMES = {
  "@keyframes contour-scroll": {
    from: { transform: "translateX(0)" },
    to: { transform: `translateX(-${VIEWBOX_WIDTH}px)` },
  },
};

function ContourSvg({ track, color }: { track: typeof CONTOUR_TRACK_1; color: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={VIEWBOX_WIDTH}
      height={VIEWBOX_HEIGHT}
      preserveAspectRatio="none"
      style={{ display: "block", flexShrink: 0 }}
    >
      {track.map((line, index) => (
        <polyline
          key={index}
          points={samplePolylinePoints(line)}
          fill="none"
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={line.opacity}
        />
      ))}
    </svg>
  );
}

/**
 * Two bands of slow-drifting topographic contour lines behind the login
 * card. Each band is rendered twice back-to-back and scrolled by exactly
 * one viewbox width, so the loop point is invisible — the wave math behind
 * `samplePolylinePoints` guarantees line #1's end matches its own start.
 * Purely decorative (`aria-hidden`), and the drift stops entirely under
 * `prefers-reduced-motion` rather than merely slowing down.
 */
export function TopographicContours() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const accent = theme.palette.accent.main;

  return (
    <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, overflow: "hidden", ...SCROLL_KEYFRAMES }}>
      <Box
        sx={{
          position: "absolute",
          top: "6%",
          left: 0,
          display: "flex",
          width: "fit-content",
          opacity: 0.9,
          animation: "contour-scroll 90s linear infinite",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <ContourSvg track={CONTOUR_TRACK_1} color={primary} />
        <ContourSvg track={CONTOUR_TRACK_1} color={primary} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          top: "58%",
          left: 0,
          display: "flex",
          width: "fit-content",
          opacity: 0.55,
          animation: "contour-scroll 130s linear infinite reverse",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <ContourSvg track={CONTOUR_TRACK_2} color={accent} />
        <ContourSvg track={CONTOUR_TRACK_2} color={accent} />
      </Box>
    </Box>
  );
}
