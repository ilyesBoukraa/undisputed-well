import { Outlet } from "react-router-dom";
import { Forbidden } from "../components/Forbidden";
import { usePermission } from "./usePermission";

/**
 * Route-level permission gate, layered on top of ProtectedRoute (which only
 * checks "is there a session"). This blocks direct URL access to
 * permission-gated routes (e.g. /rigs/new), not just the UI controls that
 * link to them — required per PLAN.md M2 e2e coverage ("lower-permission
 * role blocked from UI *and* direct URL"). Same caveat as ProtectedRoute:
 * this is UX only, FastAPI's require_permission is the real enforcement.
 */
export function RequirePermission({ permission }: { permission: string }) {
  const allowed = usePermission(permission);

  if (!allowed) {
    return <Forbidden />;
  }

  return <Outlet />;
}
