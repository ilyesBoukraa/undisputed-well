import { Alert, Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { useHealthCheck } from "../../api/health";
import { useAlertsQuery } from "../../api/operations";
import { useAllPredictionsQuery } from "../../api/predictions";
import { useRigsQuery, type RigStatus } from "../../api/rigs";
import { useWellsQuery, type WellStatus } from "../../api/wells";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { FleetStatusCard } from "./FleetStatusCard";
import { RecentAlertsCard } from "./RecentAlertsCard";
import { StatTile } from "./StatTile";

function countByStatus<S extends string>(items: { status: S }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Operations overview — the authenticated landing page. UI2: replaced the
 * placeholder health-check-only page with a real fleet-wide summary built
 * entirely on existing list endpoints (wells, rigs, alerts, predictions),
 * no new backend routes needed. Deliberately calmer than the login page's
 * animated background — this is a working UI meant to be scanned
 * repeatedly, not a one-time hero moment (see NavBar.tsx's comment for the
 * same reasoning). The original health-check/admin-notice behavior is kept
 * verbatim (same testids) as a compact status line, since M1's tests
 * already cover those states.
 */
export function Dashboard() {
  const theme = useTheme();
  const { data: health, isLoading: healthLoading, isError: healthError } = useHealthCheck();
  const canManageUsers = usePermission("admin:manage_users");

  const wellsQuery = useWellsQuery({});
  const rigsQuery = useRigsQuery({});
  const alertsQuery = useAlertsQuery({ acknowledged: false });
  const predictionsQuery = useAllPredictionsQuery();

  const wellCounts = countByStatus<WellStatus>(wellsQuery.data?.items ?? []);
  const rigCounts = countByStatus<RigStatus>(rigsQuery.data?.items ?? []);

  const unacknowledgedAlerts = alertsQuery.data?.items ?? [];
  const hasCritical = unacknowledgedAlerts.some((alert) => alert.severity === "critical");
  const alertsAccent = unacknowledgedAlerts.length === 0 ? "success" : hasCritical ? "error" : "warning";

  const predictions = predictionsQuery.data?.items ?? [];
  const atRiskCount = predictions.filter((p) => p.risk_level !== "stable").length;

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      <Box sx={{ mb: 3 }}>
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
          Operations overview
        </Typography>
        <Typography variant="h4" component="h2" sx={{ textWrap: "balance" }}>
          Fleet at a glance
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <StatTile
          label="Wells"
          value={wellsQuery.data?.total ?? 0}
          accent="primary"
          isLoading={wellsQuery.isLoading}
          isError={wellsQuery.isError}
          breakdown={Object.entries(wellCounts).map(([label, value]) => ({ label, value }))}
        />
        <StatTile
          label="Rigs"
          value={rigsQuery.data?.total ?? 0}
          accent="primary"
          isLoading={rigsQuery.isLoading}
          isError={rigsQuery.isError}
          breakdown={Object.entries(rigCounts).map(([label, value]) => ({ label, value }))}
        />
        <StatTile
          label="Active Alerts"
          value={unacknowledgedAlerts.length}
          accent={alertsAccent}
          isLoading={alertsQuery.isLoading}
          isError={alertsQuery.isError}
        />
        <StatTile
          label="Predictions at Risk"
          value={`${atRiskCount} / ${predictions.length}`}
          accent={atRiskCount > 0 ? "warning" : "success"}
          isLoading={predictionsQuery.isLoading}
          isError={predictionsQuery.isError}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" }, gap: 2, mb: 3 }}>
        <RecentAlertsCard />
        <FleetStatusCard />
      </Box>

      {canManageUsers && (
        <Alert severity="info" data-testid="admin-panel-link" sx={{ mb: 2 }}>
          User management is available to your role. (Coming in a later milestone.)
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontFamily: theme.typography.fontFamilyMono,
          fontSize: "0.72rem",
          color: "text.secondary",
        }}
      >
        {healthLoading && <CircularProgress data-testid="health-loading" size={14} />}
        {healthError && (
          <Alert severity="error" data-testid="health-error" sx={{ py: 0 }}>
            Could not reach the API.
          </Alert>
        )}
        {health && <Box data-testid="health-ok">API status: {health.status}</Box>}
      </Box>
    </Box>
  );
}
