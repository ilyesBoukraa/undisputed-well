from enum import StrEnum


class Role(StrEnum):
    """
    Fixed role set for M1. Per the RBAC design decision (see PLAN.md Q11), the
    frontend never hardcodes role checks — it only ever asks "do I have
    permission:X" via the permissions array returned at login. That means the
    role -> permission mapping can be extended or made fully dynamic later
    (e.g. a permissions table) without any frontend change.
    """

    ADMIN = "admin"
    ENGINEER = "engineer"
    VIEWER = "viewer"


# Permission strings follow "resource:action", matching the frontend's
# usePermission('resource:action') hook contract.
ROLE_PERMISSIONS: dict[Role, frozenset[str]] = {
    Role.ADMIN: frozenset(
        {
            "well:read",
            "well:edit",
            "well:delete",
            "rig:read",
            "rig:edit",
            "rig:delete",
            "threshold:configure",
            "ai:query",
            "admin:manage_users",
        }
    ),
    Role.ENGINEER: frozenset(
        {
            "well:read",
            "well:edit",
            "rig:read",
            "rig:edit",
            "threshold:configure",
            "ai:query",
        }
    ),
    Role.VIEWER: frozenset(
        {
            "well:read",
            "rig:read",
            "ai:query",
        }
    ),
}


def permissions_for_role(role: Role) -> list[str]:
    return sorted(ROLE_PERMISSIONS.get(role, frozenset()))
