from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.security import generate_token, verify_password
from app.models.session import Session as SessionModel
from app.models.user import User


def authenticate_user(db: DbSession, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def create_session(db: DbSession, user: User) -> SessionModel:
    session = SessionModel(
        id=generate_token(),
        user_id=user.id,
        csrf_token=generate_token(),
        expires_at=datetime.now(timezone.utc)
        + timedelta(hours=settings.session_lifetime_hours),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_valid_session(db: DbSession, session_id: str) -> SessionModel | None:
    if not session_id:
        return None
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if session is None:
        return None
    if session.is_expired:
        db.delete(session)
        db.commit()
        return None
    return session


def delete_session(db: DbSession, session_id: str) -> None:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if session is not None:
        db.delete(session)
        db.commit()
