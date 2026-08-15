from http.cookies import SimpleCookie

from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CSRFMiddleware:
    """
    Double-submit CSRF check, applied globally to every mutating request
    rather than opt-in per route — a route protected only by a per-endpoint
    dependency is one refactor away from silently losing CSRF coverage;
    middleware makes that impossible to forget. Login is self-exempting: it
    has no session cookie yet, so there's nothing to protect until a session
    exists.

    Implemented as a plain ASGI middleware (not Starlette's
    BaseHTTPMiddleware) deliberately: it only ever needs to read headers, and
    BaseHTTPMiddleware's request/response wrapping has known body-passthrough
    quirks with some ASGI transports (notably Starlette's TestClient) that a
    header-only check has no reason to risk.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in _SAFE_METHODS:
            await self.app(scope, receive, send)
            return

        cookies = self._parse_cookies(scope)
        session_id = cookies.get(settings.session_cookie_name)

        if session_id:
            csrf_cookie = cookies.get(settings.csrf_cookie_name)
            csrf_header = self._header(scope, settings.csrf_header_name)
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                await self._reject(send)
                return

        await self.app(scope, receive, send)

    @staticmethod
    def _parse_cookies(scope: Scope) -> dict[str, str]:
        raw = CSRFMiddleware._header(scope, "cookie")
        if not raw:
            return {}
        jar: SimpleCookie = SimpleCookie()
        jar.load(raw)
        return {key: morsel.value for key, morsel in jar.items()}

    @staticmethod
    def _header(scope: Scope, name: str) -> str | None:
        name_bytes = name.lower().encode("latin-1")
        for key, value in scope.get("headers", []):
            if key == name_bytes:
                return value.decode("latin-1")
        return None

    @staticmethod
    async def _reject(send: Send) -> None:
        body = b'{"detail":"CSRF token missing or invalid"}'
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send({"type": "http.response.body", "body": body})
