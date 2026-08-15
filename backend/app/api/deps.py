from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.permissions import Role, permissions_for_role
from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.models.user import User
from app.services.auth import get_valid_session


def get_current_session(request: Request, db: DbSession = Depends(get_db)) -> SessionModel:
    """
    Resolves and validates the opaque session cookie. This is the one place
    session validity is checked — every protected route depends on it
    (directly or via require_permission/get_current_user), so there is a
    single point of truth for "is this request authenticated".
    """
    session_id = request.cookies.get(settings.session_cookie_name)
    session = get_valid_session(db, session_id) if session_id else None

    if session is None or session.user is None or not session.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    return session


def get_current_user(session: SessionModel = Depends(get_current_session)) -> User:
    return session.user


def require_permission(permission: str):
    """
    FastAPI dependency factory used to protect a route with a single
    permission string, e.g. `Depends(require_permission("well:edit"))`.
    This is the actual enforcement point — the frontend's usePermission hook
    is UX convenience only, per the RBAC design decision in PLAN.md.
    """

    def _check(user: User = Depends(get_current_user)) -> User:
        role = Role(user.role)
        if permission not in permissions_for_role(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return user

    return _check

