import { Box, CircularProgress, Typography, alpha, useTheme } from "@mui/material";
import type { ReactNode } from "react";

export type StatTileAccent = "primary" | "accent" | "success" | "warning" | "error";

interface StatTileProps {
  label: string;
  value: ReactNode;
  accent?: StatTileAccent;
  isLoading?: boolean;
  isError?: boolean;
  errorText?: string;
  /** Small breakdown row under the headline number, e.g. status counts. */
  breakdown?: { label: string; value: number }[];
}

/**
 * One instrumentation-style KPI tile — an eyebrow label, a big tabular-nums
 * headline number, and an optional breakdown row. `accent` picks which
 * theme color the headline and left edge glow use; loading/error are each
 * tile's own independent state (one query failing shouldn't blank the
 * others), matching the rest of the app's per-section API-state pattern.
 */
export function StatTile({ label, value, accent = "primary", isLoading, isError, errorText, breakdown }: StatTileProps) {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;

  return (
    <Box
      data-testid={`stat-tile-${slug(label)}`}
      sx={{
        position: "relative",
        p: 2.5,
        borderRadius: 2.5,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          left: 0,
          width: 3,
          bgcolor: accentColor,
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: theme.typography.fontFamilyMono,
          fontSize: "0.68rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "text.secondary",
          mb: 1,
        }}
      >
        {label}
      </Typography>

      {isLoading && <CircularProgress size={22} data-testid={`stat-loading-${slug(label)}`} />}

      {isError && !isLoading && (
        <Typography variant="body2" color="error" data-testid={`stat-error-${slug(label)}`}>
          {errorText ?? "Unavailable"}
        </Typography>
      )}

      {!isLoading && !isError && (
        <>
          <Typography
            sx={{
              fontFamily: theme.typography.h1.fontFamily,
              fontWeight: 600,
              fontSize: "2.1rem",
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              color: accentColor,
            }}
          >
            {value}
          </Typography>

          {breakdown && breakdown.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mt: 1.5 }}>
              {breakdown.map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    fontFamily: theme.typography.fontFamilyMono,
                    fontSize: "0.68rem",
                    letterSpacing: "0.02em",
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                    color: "text.secondary",
                  }}
                >
                  {item.value} {item.label}
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
