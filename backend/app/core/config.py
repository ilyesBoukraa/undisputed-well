from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application configuration.

    Values are sourced from environment variables (see docker-compose.yml).
    FastAPI remains the source of truth for all auth/session/security settings —
    the frontend never encodes any of this.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "UndisputedWell API"
    environment: str = "development"

    database_url: str = (
        "postgresql+psycopg2://undisputedwell:undisputedwell@postgres:5432/undisputedwell"
    )

    # Session cookie settings (M1) — declared here now so config stays centralized
    # as auth is built out.
    session_cookie_name: str = "uw_session"
    csrf_cookie_name: str = "uw_csrf"
    csrf_header_name: str = "X-CSRF-Token"
    session_secret_key: str = "change-me-in-production"
    session_cookie_secure: bool = True
    session_cookie_samesite: str = "strict"
    session_lifetime_hours: int = 12

    cors_allow_origins: list[str] = []  # empty: same-origin via nginx, no CORS needed


settings = Settings()
