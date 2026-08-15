import { Alert as MuiAlert, Box, Chip, CircularProgress, Typography } from "@mui/material";
import { useRigsQuery, type RigStatus } from "../../api/rigs";

const STATUS_COLOR: Record<RigStatus, "success" | "warning" | "default"> = {
  active: "success",
  maintenance: "warning",
  idle: "default",
};

const DISPLAY_LIMIT = 8;

/** Quick rig-by-rig status list, for "what's running right now" at a glance. */
export function FleetStatusCard() {
  const { data, isLoading, isError } = useRigsQuery({});
  const rigs = data?.items ?? [];
  const shown = rigs.slice(0, DISPLAY_LIMIT);

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
        Fleet Status
      </Typography>

      {isLoading && <CircularProgress size={24} data-testid="fleet-status-loading" />}

      {isError && (
        <MuiAlert severity="error" data-testid="fleet-status-error">
          Could not load rigs.
        </MuiAlert>
      )}

      {data && rigs.length === 0 && (
        <MuiAlert severity="info" data-testid="fleet-status-empty">
          No rigs registered yet.
        </MuiAlert>
      )}

      {shown.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          {shown.map((rig) => (
            <Box
              component="li"
              key={rig.id}
              data-testid={`fleet-rig-${rig.id}`}
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
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {rig.name}
                <Typography component="span" variant="body2" color="text.secondary">
                  {" "}
                  — {rig.location}
                </Typography>
              </Typography>
              <Chip size="small" label={rig.status} color={STATUS_COLOR[rig.status]} />
            </Box>
          ))}
          {rigs.length > DISPLAY_LIMIT && (
            <Typography variant="caption" color="text.secondary">
              +{rigs.length - DISPLAY_LIMIT} more on the Rigs page
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
