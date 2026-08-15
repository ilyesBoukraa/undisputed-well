import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { usePermission } from "../../auth/usePermission";
import { NavBar } from "../../components/NavBar";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { StatusChip } from "../../components/StatusChip";
import { useWellsQuery, type WellStatus } from "../../api/wells";

const STATUS_OPTIONS: WellStatus[] = ["drilling", "producing", "shut_in", "abandoned"];

export function WellsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = usePermission("well:edit");

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "") as WellStatus | "";
  const sort = (searchParams.get("sort") ?? "name") as "name" | "created_at" | "status";
  const order = (searchParams.get("order") ?? "asc") as "asc" | "desc";

  const { data, isLoading, isError } = useWellsQuery({ q, status, sort, order });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function toggleSort(column: "name" | "status") {
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

      <PageHeader
        eyebrow="Fleet management"
        title="Wells"
        action={
          canEdit && (
            <Button component={RouterLink} to="/wells/new" variant="contained">
              New Well
            </Button>
          )
        }
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Search"
          size="small"
          value={q}
          onChange={(e) => updateParam("q", e.target.value)}
          data-testid="well-search"
        />
        <TextField
          label="Status"
          size="small"
          select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          sx={{ minWidth: 160 }}
          data-testid="well-status-filter"
        >
          <MenuItem value="">All</MenuItem>
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {isLoading && <CircularProgress data-testid="wells-loading" size={24} />}

      {isError && (
        <Alert severity="error" data-testid="wells-error">
          Could not load wells.
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Alert severity="info" data-testid="wells-empty">
          No wells found.
        </Alert>
      )}

      {data && data.items.length > 0 && (
        <Panel sx={{ p: 0, overflow: "hidden" }}>
          <TableContainer>
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
                  <TableCell>
                    <TableSortLabel
                      active={sort === "status"}
                      direction={sort === "status" ? order : "asc"}
                      onClick={() => toggleSort("status")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Rig</TableCell>
                  <TableCell>Depth (m)</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((well) => (
                  <TableRow key={well.id} data-testid={`well-row-${well.id}`}>
                    <TableCell>
                      <RouterLink to={`/wells/${well.id}`}>{well.name}</RouterLink>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={well.status} />
                    </TableCell>
                    <TableCell>{well.rig ? well.rig.name : "—"}</TableCell>
                    <TableCell>{well.depth_m ?? "—"}</TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <Button size="small" component={RouterLink} to={`/wells/${well.id}/edit`}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Panel>
      )}
    </Box>
  );
}
