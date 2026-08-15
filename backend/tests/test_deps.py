import pytest
from fastapi import HTTPException

from app.api.deps import require_permission
from app.core.permissions import Role


class _FakeUser:
    def __init__(self, role: Role):
        self.role = role.value


def test_require_permission_allows_user_with_permission():
    check = require_permission("well:edit")
    user = check(user=_FakeUser(Role.ENGINEER))
    assert user.role == Role.ENGINEER.value


def test_require_permission_rejects_user_without_permission():
    check = require_permission("admin:manage_users")
    with pytest.raises(HTTPException) as exc_info:
        check(user=_FakeUser(Role.VIEWER))
    assert exc_info.value.status_code == 403
