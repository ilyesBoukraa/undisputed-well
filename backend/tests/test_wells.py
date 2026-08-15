from tests.conftest import csrf_headers


def _create_rig(client, name="Rig Alpha"):
    return client.post(
        "/api/rigs",
        json={"name": name, "location": "North Field"},
        headers=csrf_headers(client),
    ).json()


def _create_well(client, name="Well-1", **overrides):
    payload = {"name": name, "status": "drilling", **overrides}
    return client.post("/api/wells", json=payload, headers=csrf_headers(client))


def test_list_wells_requires_authentication(client):
    assert client.get("/api/wells").status_code == 401


def test_list_wells_empty(logged_in_client):
    response = logged_in_client.get("/api/wells")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_engineer_can_create_well_without_rig(logged_in_client):
    response = _create_well(logged_in_client)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Well-1"
    assert body["rig_id"] is None
    assert body["rig"] is None


def test_engineer_can_create_well_with_rig(logged_in_client):
    rig = _create_rig(logged_in_client)
    response = _create_well(logged_in_client, name="Well-2", rig_id=rig["id"])
    assert response.status_code == 201
    body = response.json()
    assert body["rig_id"] == rig["id"]
    assert body["rig"]["name"] == "Rig Alpha"


def test_create_well_with_nonexistent_rig_is_rejected(logged_in_client):
    response = _create_well(logged_in_client, rig_id=999999)
    assert response.status_code == 422


def test_create_well_with_negative_depth_is_rejected(logged_in_client):
    response = _create_well(logged_in_client, depth_m=-5)
    assert response.status_code == 422


def test_viewer_cannot_create_well(viewer_client):
    response = _create_well(viewer_client)
    assert response.status_code == 403


def test_create_well_with_duplicate_name_is_rejected(logged_in_client):
    _create_well(logged_in_client, name="Well-Dup")
    response = _create_well(logged_in_client, name="Well-Dup")
    assert response.status_code == 409


def test_get_well_detail_404(logged_in_client):
    assert logged_in_client.get("/api/wells/999999").status_code == 404


def test_engineer_can_update_well(logged_in_client):
    created = _create_well(logged_in_client).json()
    response = logged_in_client.patch(
        f"/api/wells/{created['id']}",
        json={"status": "producing", "depth_m": 1200.5},
        headers=csrf_headers(logged_in_client),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "producing"
    assert body["depth_m"] == 1200.5


def test_update_well_to_nonexistent_rig_is_rejected(logged_in_client):
    created = _create_well(logged_in_client).json()
    response = logged_in_client.patch(
        f"/api/wells/{created['id']}",
        json={"rig_id": 999999},
        headers=csrf_headers(logged_in_client),
    )
    assert response.status_code == 422


def test_viewer_cannot_update_well(logged_in_client, viewer_client):
    created = _create_well(logged_in_client).json()
    response = viewer_client.patch(
        f"/api/wells/{created['id']}",
        json={"status": "producing"},
        headers=csrf_headers(viewer_client),
    )
    assert response.status_code == 403


def test_engineer_cannot_delete_well(logged_in_client):
    created = _create_well(logged_in_client).json()
    response = logged_in_client.delete(
        f"/api/wells/{created['id']}", headers=csrf_headers(logged_in_client)
    )
    assert response.status_code == 403


def test_admin_can_delete_well(admin_client, logged_in_client):
    created = _create_well(logged_in_client).json()
    response = admin_client.delete(
        f"/api/wells/{created['id']}", headers=csrf_headers(admin_client)
    )
    assert response.status_code == 204
    assert admin_client.get(f"/api/wells/{created['id']}").status_code == 404


def test_deleting_a_rig_nullifies_its_wells(admin_client, logged_in_client):
    rig = _create_rig(logged_in_client)
    well = _create_well(logged_in_client, name="Well-Orphan", rig_id=rig["id"]).json()

    delete_response = admin_client.delete(
        f"/api/rigs/{rig['id']}", headers=csrf_headers(admin_client)
    )
    assert delete_response.status_code == 204

    follow_up = logged_in_client.get(f"/api/wells/{well['id']}")
    assert follow_up.status_code == 200
    assert follow_up.json()["rig_id"] is None


def test_list_wells_filters_by_rig(logged_in_client):
    rig = _create_rig(logged_in_client)
    _create_well(logged_in_client, name="Well-On-Rig", rig_id=rig["id"])
    _create_well(logged_in_client, name="Well-Off-Rig")

    response = logged_in_client.get("/api/wells", params={"rig_id": rig["id"]})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Well-On-Rig"


def test_list_wells_filters_by_status(logged_in_client):
    _create_well(logged_in_client, name="Well-Drilling", status="drilling")
    _create_well(logged_in_client, name="Well-Producing", status="producing")

    response = logged_in_client.get("/api/wells", params={"status": "producing"})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Well-Producing"


def test_list_wells_sort_by_name_desc(logged_in_client):
    _create_well(logged_in_client, name="A Well")
    _create_well(logged_in_client, name="Z Well")

    response = logged_in_client.get("/api/wells", params={"sort": "name", "order": "desc"})
    names = [item["name"] for item in response.json()["items"]]
    assert names == ["Z Well", "A Well"]
