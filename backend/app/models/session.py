from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Session(Base):
    """
    Server-side session record. The session cookie the browser holds is only
    an opaque token (this table's primary key) — never the user id or any
    claims — so a session can be revoked server-side at any time (logout,
    admin-forced logout, password change) by deleting the row. This is the
    deliberate tradeoff behind the cookie-session auth decision in PLAN.md:
    more operationally flexible than a self-contained JWT, at the cost of a
    DB lookup per request.
    """

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    csrf_token: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")

    @property
    def is_expired(self) -> bool:
        # SQLite (used in tests) doesn't preserve tzinfo through DateTime(timezone=True)
        # the way Postgres (production) does, so normalize before comparing rather
        # than assuming the value read back is tz-aware.
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires_at
