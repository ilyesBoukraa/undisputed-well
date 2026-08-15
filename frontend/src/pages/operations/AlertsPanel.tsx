import { Alert as MuiAlert, Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAcknowledgeAlertMutation,
  useAlertsQuery,
  type Alert,
} from "../../api/operations";
import { useAlertStream } from "../../operations/useAlertStream";

const SEVERITY_COLOR: Record<Alert["severity"], "warning" | "error"> = {
  warning: "warning",
  critical: "error",
};

/**
 * Live unacknowledged-alert feed. The initial list comes from a normal REST
 * fetch (so a fresh page load isn't empty while the stream connects); new
 * alerts created after that arrive via SSE and are merged into the same
 * TanStack Query cache entry so there's a single source of truth for what's
 * rendered, deduplicated by id in case a REST refetch (e.g. after recording
 * a reading) and the stream both deliver the same alert.
 */
export function AlertsPanel({ wellId }: { wellId?: number }) {
  const queryClient = useQueryClient();
  const filters = { wellId, acknowledged: false as const };
  const { data, isLoading, isError } = useAlertsQuery(filters);
  const acknowledgeMutation = useAcknowledgeAlertMutation();

  const handleNewAlert = useCallback(
    (alert: Alert) => {
      queryClient.setQueryData<{ items: Alert[]; total: number }>(
        ["alerts", filters],
        (old) => {
          if (!old) return old;
          if (old.items.some((existing) => existing.id === alert.id)) return old;
          if (wellId !== undefined && alert.well_id !== wellId) return old;
          return { items: [alert, ...old.items], total: old.total + 1 };
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, wellId],
  );

  const streamStatus = useAlertStream(handleNewAlert);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h6" component="h3">
          Active Alerts
        </Typography>
        <Chip
          size="small"
          label={streamStatus === "open" ? "live" : streamStatus}
          color={streamStatus === "open" ? "success" : "default"}
          data-testid="alert-stream-status"
        />
      </Box>

      {isLoading && <CircularProgress data-testid="alerts-loading" size={24} />}

      {isError && (
        <MuiAlert severity="error" data-testid="alerts-error">
          Could not load alerts.
        </MuiAlert>
      )}

      {data && data.items.length === 0 && (
        <MuiAlert severity="success" data-testid="alerts-empty">
          No active alerts.
        </MuiAlert>
      )}

      {data && data.items.length > 0 && (
        <Stack spacing={1}>
          {data.items.map((alert) => (
            <MuiAlert
              key={alert.id}
              severity={alert.severity === "critical" ? "error" : "warning"}
              data-testid={`alert-${alert.id}`}
              action={
                <Button
                  size="small"
                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  Dismiss
                </Button>
              }
            >
              <Chip
                size="small"
                label={alert.severity}
                color={SEVERITY_COLOR[alert.severity]}
                sx={{ mr: 1 }}
              />
              Well #{alert.well_id} — {alert.metric}: {alert.value}
            </MuiAlert>
          ))}
        </Stack>
      )}
    </Box>
  );
}
