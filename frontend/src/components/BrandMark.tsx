import { useTheme } from "@mui/material";

/**
 * The derrick mark used as the favicon (public/favicon.svg), inlined here
 * so it can also appear at brand size in the UI (currently: the login
 * page header) and pick up live theme colors instead of the favicon's
 * fixed hex values. Blue mast + amber beacon light — both palette tokens
 * in the mark itself.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  const theme = useTheme();

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="UndisputedWell">
      <path
        d="M24 4L24 18M24 18L14 44M24 18L34 44M14 44H34"
        stroke={theme.palette.primary.main}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 30H31" stroke={theme.palette.primary.main} strokeWidth={3} strokeLinecap="round" />
      <path d="M15.5 37H32.5" stroke={theme.palette.primary.main} strokeWidth={3} strokeLinecap="round" />
      <circle cx={24} cy={9} r={3.2} fill={theme.palette.accent.main} />
    </svg>
  );
}
