import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";

// Covers every RigStatus and WellStatus value. One shared map rather than
// two, since the vocabularies don't overlap and a single source avoids the
// two enums' color choices silently drifting apart over time.
const STATUS_COLOR: Record<string, ChipProps["color"]> = {
  active: "success",
  producing: "success",
  maintenance: "warning",
  drilling: "info",
  idle: "default",
  shut_in: "default",
  abandoned: "default",
};

/** Small colored chip for a rig/well status string — same semantic-color
 * treatment the dashboard's FleetStatusCard introduced, extended here so
 * status is never rendered as bare text elsewhere in the app. */
export function StatusChip({ status, size = "small" }: { status: string; size?: ChipProps["size"] }) {
  return <Chip label={status} color={STATUS_COLOR[status] ?? "default"} size={size} />;
}
