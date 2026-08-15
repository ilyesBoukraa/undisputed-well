import { useAuth } from "./AuthContext";

/**
 * `usePermission('resource:action')` is UX convenience only — it decides
 * whether to render a control, not whether an action is allowed. FastAPI's
 * require_permission dependency is the actual enforcement point (see
 * PLAN.md RBAC decision); a hidden button here is not a security boundary.
 */
export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}
