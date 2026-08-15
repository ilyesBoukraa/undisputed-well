import secrets

import bcrypt

# bcrypt's algorithm ignores any password bytes past 72 — truncate explicitly
# so hashing/verifying are consistent regardless of how a caller's password
# happens to be encoded, rather than relying on bcrypt's silent behavior.
_MAX_PASSWORD_BYTES = 72


def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def generate_token(n_bytes: int = 32) -> str:
    """URL-safe random token used for both session ids and CSRF tokens."""
    return secrets.token_urlsafe(n_bytes)
