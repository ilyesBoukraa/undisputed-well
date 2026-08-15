import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.permissions import Role
from app.core.security import hash_password
from app.db.session import Base, get_db, get_sessionmaker
from app.main import app
from app.models.user import User

# Tests run against an in-memory SQLite DB rather than requiring a live
# PostgreSQL instance, so `pytest` works standalone (docker compose's
# smoke test separately verifies the real Postgres wiring).
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    # SQLite ignores FK constraints (including ON DELETE CASCADE) unless
    # explicitly told not to — without this, cascade behavior that's real
    # under Postgres would silently no-op here and go untested.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db
# Points the SSE stream's self-managed poll-loop sessions (see
# api/operations.py's get_sessionmaker dependency) at the same in-memory test
# DB, instead of the real Postgres SessionLocal.
app.dependency_overrides[get_sessionmaker] = lambda: TestingSessionLocal


@pytest.fixture
def client():
    # The session cookie is Secure=True (see PLAN.md auth decision), so the
    # test client needs an https:// base URL — httpx's cookie jar correctly
    # refuses to echo Secure cookies back over plain http, same as a real
    # browser would.
    return TestClient(app, base_url="https://testserver")


@pytest.fixture
def make_user():
    """Factory fixture: make_user(email=..., password=..., role=Role.ENGINEER)."""

    def _make(
        email: str = "engineer@undisputedwell.dev",
        password: str = "correct horse battery staple",
        role: Role = Role.ENGINEER,
    ) -> User:
        db = TestingSessionLocal()
        try:
            user = User(email=email, hashed_password=hash_password(password), role=role.value)
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        finally:
            db.close()

    return _make


def _login_as(make_user, *, email: str, role: Role):
    # Deliberately a brand-new TestClient (not the shared `client` fixture) so a
    # single test can hold two differently-authenticated clients at once (e.g.
    # to prove a viewer is blocked from something an admin created) without
    # their session cookies colliding on a shared cookie jar.
    password = "correct horse battery staple"
    make_user(email=email, password=password, role=role)
    fresh_client = TestClient(app, base_url="https://testserver")
    response = fresh_client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return fresh_client


@pytest.fixture
def logged_in_client(make_user):
    """A TestClient that has already completed a login as an engineer user."""
    return _login_as(make_user, email="engineer@undisputedwell.dev", role=Role.ENGINEER)


@pytest.fixture
def admin_client(make_user):
    return _login_as(make_user, email="admin@undisputedwell.dev", role=Role.ADMIN)


@pytest.fixture
def viewer_client(make_user):
    return _login_as(make_user, email="viewer@undisputedwell.dev", role=Role.VIEWER)


def csrf_headers(logged_in_client):
    """Reads the CSRF cookie off an already-logged-in TestClient and returns the
    header dict needed to pass the double-submit CSRF check on mutating requests."""
    from app.core.config import settings

    token = logged_in_client.cookies.get(settings.csrf_cookie_name)
    return {settings.csrf_header_name: token}
