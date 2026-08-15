from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_current_session, get_current_user
from app.core.config import settings
from app.core.permissions import Role, permissions_for_role
from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.auth import LoginRequest, UserOut
from app.services.auth import authenticate_user, create_session, delete_session

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        permissions=permissions_for_role(Role(user.role)),
    )


def _set_session_cookies(response: Response, session_id: str, csrf_token: str) -> None:
    cookie_kwargs = dict(
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=settings.session_lifetime_hours * 3600,
        path="/",
    )
    response.set_cookie(settings.session_cookie_name, session_id, httponly=True, **cookie_kwargs)
    # Deliberately NOT httponly — the frontend must be able to read this and
    # echo it back as a header for the double-submit CSRF check to work.
    response.set_cookie(settings.csrf_cookie_name, csrf_token, httponly=False, **cookie_kwargs)


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: DbSession = Depends(get_db)) -> UserOut:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    session = create_session(db, user)
    _set_session_cookies(response, session.id, session.csrf_token)
    return _user_out(user)


@router.post("/logout")
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    session: SessionModel = Depends(get_current_session),
) -> dict:
    delete_session(db, session.id)
    _clear_session_cookies(response)
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(user)
