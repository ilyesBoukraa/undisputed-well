import { Box, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

/**
 * The eyebrow + title header pattern introduced on the dashboard ("Operations
 * overview" / "Fleet at a glance"), extended to every other page's top-level
 * heading in UI3 so the whole app reads as one system rather than a
 * redesigned dashboard bolted onto otherwise-unstyled pages. `title` keeps
 * the same heading role/text every page already had — only the visual
 * treatment and the eyebrow are new.
 */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography
          sx={{
            fontFamily: theme.typography.fontFamilyMono,
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "accent.main",
            mb: 0.5,
          }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h4" component="h2" sx={{ textWrap: "balance" }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}
