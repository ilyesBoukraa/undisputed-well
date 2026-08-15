import { Box, Button, Typography, alpha, useTheme } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLogoutMutation } from "../auth/useLogoutMutation";
import { BrandMark } from "./BrandMark";
import { ThemeModeToggle } from "./ThemeModeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/rigs", label: "Rigs" },
  { to: "/wells", label: "Wells" },
  { to: "/operations", label: "Operations" },
  { to: "/predictions", label: "Predictions" },
  { to: "/assistant", label: "Assistant" },
];

/**
 * Shared header/nav used by every authenticated page. Factored out of the
 * original Dashboard header (M1) so M2's list/detail pages get the same
 * chrome and navigation without duplicating the sign-out wiring.
 *
 * UI2: restyled as a bordered, translucent/blurred "control strip" (same
 * card language as the UI1 login card) with the brand mark, active-route
 * indicator, and the user's role as a small instrumentation-style badge —
 * deliberately *not* the animated aurora/contour background from the login
 * page, which would fight legibility on pages full of dense tables and
 * forms. Kept inline in each page's existing padded layout rather than
 * made sticky/full-bleed, since doing that would mean touching the layout
 * of every page that renders it — that's UI3's job, not this one's.
 */
export function NavBar() {
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const location = useLocation();
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
        mb: 3,
        px: 2.5,
        py: 1.5,
        borderRadius: 2.5,
        border: 1,
        borderColor: "divider",
        bgcolor: (t) => alpha(t.palette.background.paper, t.palette.mode === "dark" ? 0.7 : 0.9),
        backdropFilter: "blur(16px)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BrandMark size={26} />
          <Typography variant="h4" component="h1" sx={{ fontSize: "1.3rem" }}>
            UndisputedWell
          </Typography>
        </Box>
        <Box component="nav" sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                size="small"
                aria-current={isActive ? "page" : undefined}
                sx={{
                  color: isActive ? "primary.main" : "text.secondary",
                  borderBottom: 2,
                  borderColor: isActive ? "primary.main" : "transparent",
                  borderRadius: 0,
                  pb: 0.5,
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {user && (
          <Box
            data-testid="current-user"
            sx={{
              fontFamily: theme.typography.fontFamilyMono,
              fontSize: "0.7rem",
              letterSpacing: "0.03em",
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              border: 1,
              borderColor: alpha(theme.palette.accent.main, 0.4),
              bgcolor: alpha(theme.palette.accent.main, 0.1),
              color: "accent.main",
            }}
          >
            {user.email} ({user.role})
          </Box>
        )}
        <ThemeModeToggle />
        <Button
          variant="outlined"
          size="small"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </Box>
    </Box>
  );
}
