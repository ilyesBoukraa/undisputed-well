from app.core.permissions import Role, permissions_for_role


def test_admin_has_full_permission_set():
    permissions = permissions_for_role(Role.ADMIN)
    assert "admin:manage_users" in permissions
    assert "well:delete" in permissions


def test_viewer_has_read_only_permissions():
    permissions = permissions_for_role(Role.VIEWER)
    assert "well:read" in permissions
    assert "well:edit" not in permissions
    assert "admin:manage_users" not in permissions


def test_engineer_can_operate_but_not_administer():
    permissions = permissions_for_role(Role.ENGINEER)
    assert "well:edit" in permissions
    assert "threshold:configure" in permissions
    assert "admin:manage_users" not in permissions
