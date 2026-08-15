import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { useRigsQuery, type RigStatus } from "../../api/rigs";

const STATUS_OPTIONS: RigStatus[] = ["active", "maintenance", "idle"];

export function RigsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = usePermission("rig:edit");

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "") as RigStatus | "";
  const sort = (searchParams.get("sort") ?? "name") as "name" | "created_at";
  const order = (searchParams.get("order") ?? "asc") as "asc" | "desc";

  const { data, isLoading, isError } = useRigsQuery({ q, status, sort, order });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function toggleSort(column: "name" | "created_at") {
    if (sort === column) {
      updateParam("order", order === "asc" ? "desc" : "asc");
    } else {
      const next = new URLSearchParams(searchParams);
      next.set("sort", column);
      next.set("order", "asc");
      setSearchParams(next);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <NavBar />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" component="h2">
          Rigs
        </Typography>
        {canEdit && (
          <Button component={RouterLink} to="/rigs/new" variant="contained">
            New Rig
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Search"
          size="small"
          value={q}
          onChange={(e) => updateParam("q", e.target.value)}
          data-testid="rig-search"
        />
        <TextField
          label="Status"
          size="small"
          select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          sx={{ minWidth: 160 }}
          data-testid="rig-status-filter"
        >
          <MenuItem value="">All</MenuItem>
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {isLoading && <CircularProgress data-testid="rigs-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="rigs-error">
          Could not load rigs.
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Alert severity="info" data-testid="rigs-empty">
          No rigs found.
        </Alert>
      )}

      {data && data.items.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sort === "name"}
                    direction={sort === "name" ? order : "asc"}
                    onClick={() => toggleSort("name")}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort === "created_at"}
                    direction={sort === "created_at" ? order : "asc"}
                    onClick={() => toggleSort("created_at")}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((rig) => (
                <TableRow key={rig.id} data-testid={`rig-row-${rig.id}`}>
                  <TableCell>
                    <RouterLink to={`/rigs/${rig.id}`}>{rig.name}</RouterLink>
                  </TableCell>
                  <TableCell>{rig.location}</TableCell>
                  <TableCell>{rig.status}</TableCell>
                  <TableCell>{new Date(rig.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    {canEdit && (
                      <Button size="small" component={RouterLink} to={`/rigs/${rig.id}/edit`}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
