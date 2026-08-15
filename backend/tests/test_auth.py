from app.core.config import settings
from app.core.permissions import Role


def test_login_with_correct_credentials_succeeds(client, make_user):
    make_user(email="viewer@undisputedwell.dev", password="s3cret-pw", role=Role.VIEWER)

    response = client.post(
        "/api/auth/login",
        json={"email": "viewer@undisputedwell.dev", "password": "s3cret-pw"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "viewer@undisputedwell.dev"
    assert body["role"] == "viewer"
    assert "well:read" in body["permissions"]
    assert settings.session_cookie_name in response.cookies
    assert settings.csrf_cookie_name in response.cookies


def test_login_with_wrong_password_is_rejected(client, make_user):
    make_user(email="viewer@undisputedwell.dev", password="correct-pw")

    response = client.post(
        "/api/auth/login",
        json={"email": "viewer@undisputedwell.dev", "password": "wrong-pw"},
    )

    assert response.status_code == 401
    assert settings.session_cookie_name not in response.cookies


def test_login_with_unknown_email_is_rejected(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@undisputedwell.dev", "password": "whatever"},
    )

    assert response.status_code == 401


def test_me_without_session_is_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_valid_session_returns_current_user(logged_in_client):
    response = logged_in_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "engineer@undisputedwell.dev"


def test_logout_without_csrf_header_is_rejected(logged_in_client):
    response = logged_in_client.post("/api/auth/logout")
    assert response.status_code == 403


def test_logout_with_csrf_header_ends_the_session(logged_in_client):
    csrf_token = logged_in_client.cookies.get(settings.csrf_cookie_name)

    response = logged_in_client.post(
        "/api/auth/logout", headers={settings.csrf_header_name: csrf_token}
    )
    assert response.status_code == 200

    follow_up = logged_in_client.get("/api/auth/me")
    assert follow_up.status_code == 401


def test_mutating_request_without_csrf_token_is_rejected_even_with_valid_session(
    logged_in_client,
):
    # Simulate a cross-site attacker: valid session cookie present (the browser
    # would attach it automatically) but no CSRF header, and a mismatched value
    # even if one is guessed.
    response = logged_in_client.post(
        "/api/auth/logout", headers={settings.csrf_header_name: "not-the-real-token"}
    )
    assert response.status_code == 403
