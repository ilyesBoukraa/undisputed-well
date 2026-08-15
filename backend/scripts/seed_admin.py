"""
Creates (or updates the password of) an initial admin user.

There is no public signup endpoint — everything in UndisputedWell is behind a
login wall (see PLAN.md) — so the first user has to be provisioned this way.

Usage (inside the backend container):
    python -m scripts.seed_admin <email> <password>
"""

import sys

from app.core.permissions import Role
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.user import User


def seed_admin(email: str, password: str) -> None:
    Base.metadata.create_all(bind=engine)  # safety net if migrations haven't run yet
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email, role=Role.ADMIN.value)
            db.add(user)
        user.hashed_password = hash_password(password)
        user.role = Role.ADMIN.value
        user.is_active = True
        db.commit()
        print(f"Admin user ready: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m scripts.seed_admin <email> <password>")
        sys.exit(1)
    seed_admin(sys.argv[1], sys.argv[2])
