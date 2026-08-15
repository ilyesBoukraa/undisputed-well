import { Alert, Box, Chip, CircularProgress, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useReadingsQuery, type ReadingStatus } from "../../api/operations";

const STATUS_COLOR: Record<ReadingStatus, "success" | "warning" | "error"> = {
  normal: "success",
  warning: "warning",
  breach: "error",
};

export function ReadingsHistory({ wellId }: { wellId: number }) {
  const { data, isLoading, isError } = useReadingsQuery(wellId);

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Recent Readings
      </Typography>

      {isLoading && <CircularProgress data-testid="readings-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="readings-error">
          Could not load readings.
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Alert severity="info" data-testid="readings-empty">
          No readings recorded yet.
        </Alert>
      )}

      {data && data.items.length > 0 && (
        <List dense>
          {data.items.slice(0, 10).map((reading) => (
            <ListItem key={reading.id} data-testid={`reading-row-${reading.id}`}>
              <Chip size="small" label={reading.status} color={STATUS_COLOR[reading.status]} sx={{ mr: 1 }} />
              <ListItemText
                primary={`${reading.metric}: ${reading.value}`}
                secondary={new Date(reading.recorded_at).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
