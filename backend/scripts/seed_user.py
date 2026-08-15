"""
Creates (or updates the password/role of) a user with an arbitrary role.
Generalizes seed_admin.py — used by the M2 e2e suite to provision a viewer
account for permission-blocked-access assertions (see PLAN.md).

Usage (inside the backend container):
    python -m scripts.seed_user <email> <password> <role: admin|engineer|viewer>
"""

import sys

from app.core.permissions import Role
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.user import User


def seed_user(email: str, password: str, role: Role) -> None:
    Base.metadata.create_all(bind=engine)  # safety net if migrations haven't run yet
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email, role=role.value)
            db.add(user)
        user.hashed_password = hash_password(password)
        user.role = role.value
        user.is_active = True
        db.commit()
        print(f"User ready: {email} ({role.value})")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m scripts.seed_user <email> <password> <role: admin|engineer|viewer>")
        sys.exit(1)
    seed_user(sys.argv[1], sys.argv[2], Role(sys.argv[3]))
