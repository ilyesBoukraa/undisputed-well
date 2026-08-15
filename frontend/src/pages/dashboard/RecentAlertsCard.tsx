import { Alert as MuiAlert, Box, Chip, CircularProgress, Typography, useTheme } from "@mui/material";
import { useAlertsQuery } from "../../api/operations";
import { useWellsQuery } from "../../api/wells";

const RECENT_LIMIT = 6;

/**
 * Fleet-wide recent-alerts feed for the dashboard — as opposed to
 * operations/AlertsPanel.tsx, which is scoped to one well (or "all,
 * unacknowledged only") and lets you dismiss them. This one is read-only
 * summary: newest few alerts across every well, acknowledged or not, so
 * the dashboard reads as "what's been happening" rather than "what needs
 * action right now" (that's what the Operations page is for).
 */
export function RecentAlertsCard() {
  const theme = useTheme();
  const { data, isLoading, isError } = useAlertsQuery({});
  const { data: wellsData } = useWellsQuery({});

  const wellNameById = new Map((wellsData?.items ?? []).map((well) => [well.id, well.name]));
  const recentAlerts = (data?.items ?? []).slice(0, RECENT_LIMIT);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        height: "100%",
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Recent Alerts
      </Typography>

      {isLoading && <CircularProgress size={24} data-testid="recent-alerts-loading" />}

      {isError && (
        <MuiAlert severity="error" data-testid="recent-alerts-error">
          Could not load alerts.
        </MuiAlert>
      )}

      {data && recentAlerts.length === 0 && (
        <MuiAlert severity="success" data-testid="recent-alerts-empty">
          No alerts have been raised yet.
        </MuiAlert>
      )}

      {recentAlerts.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          {recentAlerts.map((alert) => (
            <Box
              component="li"
              key={alert.id}
              data-testid={`recent-alert-${alert.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
              }}
            >
              <Chip
                size="small"
                label={alert.severity}
                color={alert.severity === "critical" ? "error" : "warning"}
              />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {wellNameById.get(alert.well_id) ?? `Well #${alert.well_id}`} — {alert.metric}: {alert.value}
              </Typography>
              {!alert.acknowledged && (
                <Box
                  sx={{
                    fontFamily: theme.typography.fontFamilyMono,
                    fontSize: "0.62rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "accent.main",
                  }}
                >
                  unacked
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
