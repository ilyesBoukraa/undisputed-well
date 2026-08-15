from tests.conftest import csrf_headers


def _create_rig(client, name="Rig Alpha", location="North Field", status="active"):
    return client.post(
        "/api/rigs",
        json={"name": name, "location": location, "status": status},
        headers=csrf_headers(client),
    )


def test_list_rigs_requires_authentication(client):
    response = client.get("/api/rigs")
    assert response.status_code == 401


def test_list_rigs_empty(logged_in_client):
    response = logged_in_client.get("/api/rigs")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_engineer_can_create_rig(logged_in_client):
    response = _create_rig(logged_in_client)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Rig Alpha"
    assert body["status"] == "active"
    assert "id" in body


def test_viewer_cannot_create_rig(viewer_client):
    response = _create_rig(viewer_client)
    assert response.status_code == 403


def test_create_rig_without_csrf_header_is_rejected(logged_in_client):
    response = logged_in_client.post(
        "/api/rigs", json={"name": "Rig Beta", "location": "South Field"}
    )
    assert response.status_code == 403


def test_create_rig_with_duplicate_name_is_rejected(logged_in_client):
    _create_rig(logged_in_client, name="Rig Alpha")
    response = _create_rig(logged_in_client, name="Rig Alpha")
    assert response.status_code == 409


def test_create_rig_with_missing_fields_is_rejected(logged_in_client):
    response = logged_in_client.post(
        "/api/rigs", json={"name": ""}, headers=csrf_headers(logged_in_client)
    )
    assert response.status_code == 422


def test_get_rig_detail(logged_in_client):
    created = _create_rig(logged_in_client).json()
    response = logged_in_client.get(f"/api/rigs/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Rig Alpha"


def test_get_rig_detail_404(logged_in_client):
    response = logged_in_client.get("/api/rigs/999999")
    assert response.status_code == 404


def test_engineer_can_update_rig(logged_in_client):
    created = _create_rig(logged_in_client).json()
    response = logged_in_client.patch(
        f"/api/rigs/{created['id']}",
        json={"status": "maintenance"},
        headers=csrf_headers(logged_in_client),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "maintenance"
    assert response.json()["name"] == "Rig Alpha"


def test_viewer_cannot_update_rig(logged_in_client, viewer_client):
    created = _create_rig(logged_in_client).json()
    response = viewer_client.patch(
        f"/api/rigs/{created['id']}",
        json={"status": "maintenance"},
        headers=csrf_headers(viewer_client),
    )
    assert response.status_code == 403


def test_engineer_cannot_delete_rig(logged_in_client):
    created = _create_rig(logged_in_client).json()
    response = logged_in_client.delete(
        f"/api/rigs/{created['id']}", headers=csrf_headers(logged_in_client)
    )
    assert response.status_code == 403


def test_admin_can_delete_rig(admin_client, logged_in_client):
    created = _create_rig(logged_in_client).json()
    response = admin_client.delete(
        f"/api/rigs/{created['id']}", headers=csrf_headers(admin_client)
    )
    assert response.status_code == 204

    follow_up = admin_client.get(f"/api/rigs/{created['id']}")
    assert follow_up.status_code == 404


def test_list_rigs_filters_by_status(logged_in_client):
    _create_rig(logged_in_client, name="Rig Active", status="active")
    _create_rig(logged_in_client, name="Rig Idle", status="idle")

    response = logged_in_client.get("/api/rigs", params={"status": "idle"})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Rig Idle"


def test_list_rigs_search_by_name(logged_in_client):
    _create_rig(logged_in_client, name="Northwind Rig")
    _create_rig(logged_in_client, name="Southline Rig")

    response = logged_in_client.get("/api/rigs", params={"q": "north"})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Northwind Rig"


def test_list_rigs_sort_desc(logged_in_client):
    _create_rig(logged_in_client, name="A Rig")
    _create_rig(logged_in_client, name="Z Rig")

    response = logged_in_client.get("/api/rigs", params={"sort": "name", "order": "desc"})
    names = [item["name"] for item in response.json()["items"]]
    assert names == ["Z Rig", "A Rig"]
