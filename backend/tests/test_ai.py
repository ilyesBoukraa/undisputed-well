import json

from tests.conftest import csrf_headers


def _parse_sse(body: str) -> list[dict]:
    events = []
    for block in body.strip().split("\n\n"):
        for line in block.splitlines():
            if line.startswith("data:"):
                events.append(json.loads(line[len("data:") :]))
    return events


def _ask(client, question: str):
    return client.post(
        "/api/ai/query", json={"question": question}, headers=csrf_headers(client)
    )


class TestAiQueryEndpoint:
    def test_requires_authentication(self, client):
        response = client.post("/api/ai/query", json={"question": "hello"})
        assert response.status_code == 401

    def test_requires_csrf_header(self, logged_in_client):
        response = logged_in_client.post("/api/ai/query", json={"question": "hello"})
        assert response.status_code == 403

    def test_empty_question_is_rejected(self, logged_in_client):
        response = _ask(logged_in_client, "")
        assert response.status_code == 422

    def test_overly_long_question_is_rejected(self, logged_in_client):
        response = _ask(logged_in_client, "a" * 1001)
        assert response.status_code == 422

    def test_viewer_can_query(self, viewer_client):
        response = _ask(viewer_client, "what roles are there")
        assert response.status_code == 200

    def test_engineer_can_query(self, logged_in_client):
        response = _ask(logged_in_client, "what roles are there")
        assert response.status_code == 200

    def test_admin_can_query(self, admin_client):
        response = _ask(admin_client, "what roles are there")
        assert response.status_code == 200

    def test_stream_shape_is_sources_then_tokens_then_done(self, logged_in_client):
        response = _ask(logged_in_client, "who can delete a rig")
        events = _parse_sse(response.text)

        assert events[0]["type"] == "sources"
        assert events[-1] == {"type": "done"}
        assert all(e["type"] == "token" for e in events[1:-1])

    def test_streamed_tokens_reassemble_into_the_expected_answer(self, logged_in_client):
        response = _ask(logged_in_client, "who can delete a rig")
        events = _parse_sse(response.text)

        answer = "".join(e["token"] for e in events if e["type"] == "token")
        assert "Only admins can delete a rig or a well." in answer

        sources_event = next(e for e in events if e["type"] == "sources")
        assert "Wells & Rigs Management" in sources_event["sources"]

    def test_unmatched_question_streams_the_no_match_answer_with_no_sources(self, logged_in_client):
        response = _ask(logged_in_client, "xyzzy plugh quokka wombat")
        events = _parse_sse(response.text)

        sources_event = next(e for e in events if e["type"] == "sources")
        assert sources_event["sources"] == []

        answer = "".join(e["token"] for e in events if e["type"] == "token")
        assert "don't have information" in answer

    def test_asphaltene_question_cites_the_prediction_doc(self, logged_in_client):
        response = _ask(logged_in_client, "how does asphaltene prediction work")
        events = _parse_sse(response.text)

        sources_event = next(e for e in events if e["type"] == "sources")
        assert "Asphaltene Stability Prediction" in sources_event["sources"]
