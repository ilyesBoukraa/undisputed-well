from tests.conftest import csrf_headers


def _create_well(client, name="Well-1"):
    return client.post(
        "/api/wells", json={"name": name, "status": "producing"}, headers=csrf_headers(client)
    ).json()


def _create_threshold(client, well_id, metric="pressure", **overrides):
    payload = {"well_id": well_id, "metric": metric, **overrides}
    return client.post("/api/operations/thresholds", json=payload, headers=csrf_headers(client))


def _create_reading(client, well_id, metric="pressure", value=50.0):
    return client.post(
        "/api/operations/readings",
        json={"well_id": well_id, "metric": metric, "value": value},
        headers=csrf_headers(client),
    )


class TestReadings:
    def test_reading_without_a_threshold_is_normal_and_creates_no_alert(self, logged_in_client):
        well = _create_well(logged_in_client)

        response = _create_reading(logged_in_client, well["id"], value=1000)

        assert response.status_code == 201
        body = response.json()
        assert body["reading"]["status"] == "normal"
        assert body["alert"] is None

    def test_reading_above_critical_max_is_a_breach_and_creates_a_critical_alert(
        self, logged_in_client
    ):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], warning_max=80, critical_max=100)

        response = _create_reading(logged_in_client, well["id"], value=150)

        body = response.json()
        assert body["reading"]["status"] == "breach"
        assert body["alert"]["severity"] == "critical"
        assert body["alert"]["acknowledged"] is False

    def test_reading_above_warning_max_but_below_critical_is_a_warning(self, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], warning_max=80, critical_max=100)

        response = _create_reading(logged_in_client, well["id"], value=90)

        body = response.json()
        assert body["reading"]["status"] == "warning"
        assert body["alert"]["severity"] == "warning"

    def test_reading_below_critical_min_is_a_breach(self, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], warning_min=20, critical_min=10)

        response = _create_reading(logged_in_client, well["id"], value=5)

        assert response.json()["reading"]["status"] == "breach"

    def test_reading_for_nonexistent_well_is_rejected(self, logged_in_client):
        response = _create_reading(logged_in_client, 999999)
        assert response.status_code == 422

    def test_viewer_cannot_create_a_reading(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_reading(viewer_client, well["id"])
        assert response.status_code == 403

    def test_list_readings_filters_by_well(self, logged_in_client):
        well_a = _create_well(logged_in_client, name="Well-A")
        well_b = _create_well(logged_in_client, name="Well-B")
        _create_reading(logged_in_client, well_a["id"])
        _create_reading(logged_in_client, well_b["id"])

        response = logged_in_client.get("/api/operations/readings", params={"well_id": well_a["id"]})
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["well_id"] == well_a["id"]

    def test_list_readings_requires_authentication(self, client):
        assert client.get("/api/operations/readings").status_code == 401


class TestThresholds:
    def test_engineer_can_create_a_threshold(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_threshold(logged_in_client, well["id"], warning_max=80, critical_max=100)
        assert response.status_code == 201
        assert response.json()["metric"] == "pressure"

    def test_viewer_cannot_create_a_threshold(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_threshold(viewer_client, well["id"])
        assert response.status_code == 403

    def test_duplicate_threshold_for_the_same_well_and_metric_is_rejected(self, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"])
        response = _create_threshold(logged_in_client, well["id"])
        assert response.status_code == 409

    def test_threshold_for_nonexistent_well_is_rejected(self, logged_in_client):
        response = _create_threshold(logged_in_client, 999999)
        assert response.status_code == 422

    def test_viewer_can_list_thresholds(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], warning_max=80)

        response = viewer_client.get("/api/operations/thresholds", params={"well_id": well["id"]})
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_engineer_can_update_a_threshold(self, logged_in_client):
        well = _create_well(logged_in_client)
        created = _create_threshold(logged_in_client, well["id"], warning_max=80).json()

        response = logged_in_client.patch(
            f"/api/operations/thresholds/{created['id']}",
            json={"warning_max": 90},
            headers=csrf_headers(logged_in_client),
        )
        assert response.status_code == 200
        assert response.json()["warning_max"] == 90

    def test_update_threshold_404(self, logged_in_client):
        response = logged_in_client.patch(
            "/api/operations/thresholds/999999",
            json={"warning_max": 1},
            headers=csrf_headers(logged_in_client),
        )
        assert response.status_code == 404

    def test_admin_can_delete_a_threshold(self, admin_client, logged_in_client):
        well = _create_well(logged_in_client)
        created = _create_threshold(logged_in_client, well["id"]).json()

        response = admin_client.delete(
            f"/api/operations/thresholds/{created['id']}", headers=csrf_headers(admin_client)
        )
        assert response.status_code == 204


class TestAlerts:
    def test_list_alerts_filters_by_acknowledged(self, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], critical_max=100)
        _create_reading(logged_in_client, well["id"], value=150)

        response = logged_in_client.get(
            "/api/operations/alerts", params={"well_id": well["id"], "acknowledged": False}
        )
        assert response.json()["total"] == 1

    def test_viewer_can_acknowledge_an_alert(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], critical_max=100)
        alert = _create_reading(logged_in_client, well["id"], value=150).json()["alert"]

        response = viewer_client.post(
            f"/api/operations/alerts/{alert['id']}/acknowledge", headers=csrf_headers(viewer_client)
        )
        assert response.status_code == 200
        assert response.json()["acknowledged"] is True

    def test_acknowledge_nonexistent_alert_404(self, logged_in_client):
        response = logged_in_client.post(
            "/api/operations/alerts/999999/acknowledge", headers=csrf_headers(logged_in_client)
        )
        assert response.status_code == 404

    def test_acknowledge_without_csrf_header_is_rejected(self, logged_in_client):
        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], critical_max=100)
        alert = _create_reading(logged_in_client, well["id"], value=150).json()["alert"]

        response = logged_in_client.post(f"/api/operations/alerts/{alert['id']}/acknowledge")
        assert response.status_code == 403


class TestAlertStream:
    # Starlette's TestClient cannot exercise a genuinely open-ended SSE
    # connection: its ASGI transport runs the whole app coroutine to
    # completion (`portal.call(self.app, ...)`, fully draining the response
    # body into an in-memory buffer) before `handle_request` returns
    # anything to the caller at all — including the first chunk. Since the
    # stream's generator only ever exits on client disconnect, that call
    # never returns under TestClient, so a streaming body genuinely cannot
    # be read incrementally here. This is a TestClient limitation, not
    # something addressable from route code.
    #
    # The mitigation: the polling logic underneath the route (alerts_since /
    # max_alert_id) is unit-tested directly below, the endpoint's auth gate
    # is tested here (it 401s before ever entering the generator, so it
    # completes normally under TestClient), and the actual wire-level SSE
    # behavior is verified for real in e2e/operations.spec.ts, which drives
    # a real browser EventSource against the real Uvicorn server — the one
    # environment this project's architecture actually needs it to work in.

    def test_stream_requires_authentication(self, client):
        response = client.get("/api/operations/alerts/stream")
        assert response.status_code == 401


class TestAlertsSincePolling:
    """Direct unit tests of the query logic backing the SSE poll loop."""

    def test_alerts_since_returns_only_alerts_newer_than_the_given_id(self, logged_in_client):
        from app.services.operations import alerts_since
        from tests.conftest import TestingSessionLocal

        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], critical_max=100)
        first = _create_reading(logged_in_client, well["id"], value=150).json()["alert"]
        second = _create_reading(logged_in_client, well["id"], value=200).json()["alert"]

        db = TestingSessionLocal()
        try:
            newer = alerts_since(db, first["id"])
            assert [a.id for a in newer] == [second["id"]]

            none_newer = alerts_since(db, second["id"])
            assert none_newer == []
        finally:
            db.close()

    def test_max_alert_id_reflects_the_latest_alert(self, logged_in_client):
        from app.services.operations import max_alert_id
        from tests.conftest import TestingSessionLocal

        well = _create_well(logged_in_client)
        _create_threshold(logged_in_client, well["id"], critical_max=100)

        db = TestingSessionLocal()
        try:
            assert max_alert_id(db) == 0
        finally:
            db.close()

        alert = _create_reading(logged_in_client, well["id"], value=150).json()["alert"]

        db = TestingSessionLocal()
        try:
            assert max_alert_id(db) == alert["id"]
        finally:
            db.close()
