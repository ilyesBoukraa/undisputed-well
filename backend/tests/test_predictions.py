import pytest

from tests.conftest import csrf_headers

BASE_INPUT = {
    "reservoir_pressure_psi": 4000,
    "reservoir_temperature_f": 180,
    "api_gravity": 35,
    "gas_specific_gravity": 0.8,
    "solution_gor_scf_stb": 600,
}


def _create_well(client, name="Well-1"):
    return client.post(
        "/api/wells", json={"name": name, "status": "producing"}, headers=csrf_headers(client)
    ).json()


def _create_prediction(client, well_id, resin_asphaltene_ratio=1.0, **overrides):
    payload = {"well_id": well_id, "resin_asphaltene_ratio": resin_asphaltene_ratio, **BASE_INPUT, **overrides}
    return client.post("/api/predictions", json=payload, headers=csrf_headers(client))


class TestCreatePrediction:
    def test_engineer_can_create_a_prediction(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(logged_in_client, well["id"])
        assert response.status_code == 201
        body = response.json()
        assert body["well_id"] == well["id"]
        assert len(body["curve"]) == 25

    def test_viewer_cannot_create_a_prediction(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(viewer_client, well["id"])
        assert response.status_code == 403

    def test_prediction_for_nonexistent_well_is_rejected(self, logged_in_client):
        response = _create_prediction(logged_in_client, 999999)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "field,value",
        [
            ("reservoir_pressure_psi", -100),
            ("reservoir_temperature_f", 20),  # below the gt=32 floor
            ("api_gravity", -5),
            ("gas_specific_gravity", 0),
            ("solution_gor_scf_stb", -1),
            ("resin_asphaltene_ratio", 0),
        ],
    )
    def test_invalid_input_is_rejected(self, logged_in_client, field, value):
        well = _create_well(logged_in_client)
        response = _create_prediction(logged_in_client, well["id"], **{field: value})
        assert response.status_code == 422

    def test_create_prediction_without_csrf_header_is_rejected(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = logged_in_client.post(
            "/api/predictions", json={"well_id": well["id"], "resin_asphaltene_ratio": 1.0, **BASE_INPUT}
        )
        assert response.status_code == 403


class TestPredictionModel:
    """Golden-value tests: these numbers came from running the actual
    implementation (see services/predictions.py's module docstring for the
    formulas) — this is a screening heuristic, not a validated simulator, so
    "correct" means "matches the documented, deterministic formula",
    verified here so a future change can't silently drift the model."""

    def test_low_resin_asphaltene_ratio_is_unstable(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(logged_in_client, well["id"], resin_asphaltene_ratio=1.0)
        body = response.json()

        assert body["bubble_point_pressure_psi"] == pytest.approx(2333.22, abs=0.5)
        assert body["onset_pressure_psi"] == pytest.approx(3033.18, abs=0.5)
        assert body["risk_level"] == "unstable"
        assert max(p["instability_index"] for p in body["curve"]) > 0.7

    def test_moderate_resin_asphaltene_ratio_is_at_risk(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(logged_in_client, well["id"], resin_asphaltene_ratio=4.0)
        body = response.json()

        assert body["risk_level"] == "at_risk"
        max_index = max(p["instability_index"] for p in body["curve"])
        assert 0.3 <= max_index < 0.7

    def test_high_resin_asphaltene_ratio_is_stable(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(logged_in_client, well["id"], resin_asphaltene_ratio=10.0)
        body = response.json()

        assert body["risk_level"] == "stable"
        assert max(p["instability_index"] for p in body["curve"]) < 0.3

    def test_curve_spans_from_reservoir_pressure_down_to_atmospheric(self, logged_in_client):
        well = _create_well(logged_in_client)
        response = _create_prediction(
            logged_in_client, well["id"], reservoir_pressure_psi=4000, resin_asphaltene_ratio=4.0
        )
        curve = response.json()["curve"]

        assert curve[0]["pressure"] == pytest.approx(4000, abs=0.5)
        assert curve[-1]["pressure"] == pytest.approx(14.7, abs=0.5)
        # monotonically decreasing pressure across the sweep
        pressures = [p["pressure"] for p in curve]
        assert pressures == sorted(pressures, reverse=True)

    def test_prediction_is_deterministic_for_the_same_inputs(self, logged_in_client):
        well = _create_well(logged_in_client)
        first = _create_prediction(logged_in_client, well["id"], resin_asphaltene_ratio=3.0).json()
        second = _create_prediction(logged_in_client, well["id"], resin_asphaltene_ratio=3.0).json()

        assert first["bubble_point_pressure_psi"] == second["bubble_point_pressure_psi"]
        assert first["onset_pressure_psi"] == second["onset_pressure_psi"]
        assert first["curve"] == second["curve"]


class TestPredictionHistory:
    def test_list_predictions_requires_authentication(self, client):
        assert client.get("/api/predictions").status_code == 401

    def test_list_predictions_filters_by_well(self, logged_in_client):
        well_a = _create_well(logged_in_client, name="Well-A")
        well_b = _create_well(logged_in_client, name="Well-B")
        _create_prediction(logged_in_client, well_a["id"])
        _create_prediction(logged_in_client, well_b["id"])

        response = logged_in_client.get("/api/predictions", params={"well_id": well_a["id"]})
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["well_id"] == well_a["id"]

    def test_viewer_can_list_predictions(self, viewer_client, logged_in_client):
        well = _create_well(logged_in_client)
        _create_prediction(logged_in_client, well["id"])

        response = viewer_client.get("/api/predictions", params={"well_id": well["id"]})
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_get_prediction_detail(self, logged_in_client):
        well = _create_well(logged_in_client)
        created = _create_prediction(logged_in_client, well["id"]).json()

        response = logged_in_client.get(f"/api/predictions/{created['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]
        assert len(response.json()["curve"]) == 25

    def test_get_prediction_detail_404(self, logged_in_client):
        response = logged_in_client.get("/api/predictions/999999")
        assert response.status_code == 404

    def test_deleting_a_well_removes_its_predictions(self, admin_client, logged_in_client):
        well = _create_well(logged_in_client)
        created = _create_prediction(logged_in_client, well["id"]).json()

        delete_response = admin_client.delete(
            f"/api/wells/{well['id']}", headers=csrf_headers(admin_client)
        )
        assert delete_response.status_code == 204

        follow_up = logged_in_client.get(f"/api/predictions/{created['id']}")
        assert follow_up.status_code == 404
