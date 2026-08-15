from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_sessionmaker():
    """
    Dependency used where a request handler needs to open its own short-lived
    sessions itself rather than one injected per-request (e.g. the SSE alert
    stream's poll loop — see api/operations.py). Going through a dependency
    rather than importing SessionLocal directly means tests can override it
    the same way they override get_db, instead of hitting the real database.
    """
    return SessionLocal
