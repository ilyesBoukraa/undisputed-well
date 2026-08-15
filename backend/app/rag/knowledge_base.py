"""
Static knowledge base the AI assistant retrieves from — a small, in-repo
corpus describing UndisputedWell's own features. There is no external LLM
API or vector database in this environment, so the assistant is a
self-contained, honest retrieval system grounded in this corpus (see
rag/retrieval.py and rag/synthesis.py), not a general-purpose chatbot. It
can answer questions about how the platform works; it has no access to
live well/rig/operations data.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Document:
    id: str
    title: str
    content: str


DOCUMENTS: list[Document] = [
    Document(
        id="wells-rigs",
        title="Wells & Rigs Management",
        content=(
            "UndisputedWell tracks rigs and wells as separate resources. A rig has a name, "
            "location, and status of active, maintenance, or idle. A well has a name, status "
            "of drilling, producing, shut_in, or abandoned, an optional depth in meters, an "
            "optional spud date, and can optionally be assigned to a rig. Deleting a rig does "
            "not delete its wells; instead each well's rig assignment is cleared. Viewers can "
            "list and view wells and rigs. Engineers and admins can create and edit wells and "
            "rigs. Only admins can delete a rig or a well. Well and rig lists support searching "
            "by name, filtering by status, and sorting by name or creation date."
        ),
    ),
    Document(
        id="thresholds-alerts",
        title="Operations, Thresholds & Alerts",
        content=(
            "Each well can have a threshold configuration for each metric it's monitored on: "
            "pressure, temperature, or flow_rate. A threshold configuration has an optional "
            "warning band and an optional critical band, each with a minimum and a maximum. "
            "When a reading is recorded for a well and metric, it is compared against that "
            "well's threshold configuration and classified as normal, warning, or breach. A "
            "warning or breach reading creates an alert with a severity of warning or critical. "
            "Alerts can be dismissed, which marks them acknowledged. The operations dashboard "
            "shows live alerts using a server-sent events stream, so new alerts appear without "
            "reloading the page. Recording a reading and configuring thresholds both require "
            "the threshold:configure or well:edit permission depending on the action; viewers "
            "can see alerts and thresholds but cannot create or change them."
        ),
    ),
    Document(
        id="asphaltene-prediction",
        title="Asphaltene Stability Prediction",
        content=(
            "The asphaltene prediction tool is a simplified screening heuristic, not a "
            "validated PVT simulator. Given a well's reservoir pressure, reservoir "
            "temperature, API gravity, gas specific gravity, solution gas-oil ratio, and "
            "resin/asphaltene ratio, it first computes a bubble point pressure using "
            "Standing's 1947 correlation. It then estimates an asphaltene onset pressure "
            "above the bubble point, with the offset growing as the resin/asphaltene ratio "
            "falls below a reference value of about 2. A lower resin/asphaltene ratio means "
            "higher predicted instability. The tool produces a curve of instability index "
            "against pressure, swept from reservoir pressure down to atmospheric pressure, "
            "and classifies the overall result as stable, at_risk, or unstable based on the "
            "peak instability index. Every prediction run is saved to that well's prediction "
            "history so past results can be reviewed later."
        ),
    ),
    Document(
        id="roles-permissions",
        title="Roles & Permissions",
        content=(
            "UndisputedWell has three roles: admin, engineer, and viewer. Viewers have "
            "read-only access: they can view wells, rigs, thresholds, alerts, predictions, "
            "and use the AI assistant, and they can dismiss alerts, but they cannot create, "
            "edit, or delete anything. Engineers can create and edit wells and rigs, record "
            "readings, configure thresholds, and run predictions, but cannot delete wells or "
            "rigs. Admins have every engineer permission plus the ability to delete wells and "
            "rigs and to manage users. Permission checks are enforced by the backend on every "
            "request; anything the frontend hides based on role is a convenience, not a "
            "security boundary."
        ),
    ),
    Document(
        id="auth-sessions",
        title="Authentication & Sessions",
        content=(
            "There is no public sign-up; accounts are provisioned directly in the database by "
            "an administrator. Logging in creates a server-side session referenced by an "
            "httpOnly, Secure, SameSite=Strict cookie, so the session token itself is never "
            "readable from JavaScript. A second, non-httpOnly cookie carries a CSRF token; "
            "every mutating request (POST, PATCH, DELETE) must echo that token back in an "
            "X-CSRF-Token header, or it is rejected, which protects against cross-site request "
            "forgery even though the session cookie is sent automatically by the browser. "
            "Logging out deletes the session on the server, immediately invalidating the "
            "cookie."
        ),
    ),
    Document(
        id="platform-overview",
        title="Platform Overview",
        content=(
            "UndisputedWell is an industrial monitoring platform for oil and gas well and rig "
            "operations. It combines well and rig record-keeping, threshold-based operational "
            "alerting with live updates, a simplified asphaltene stability screening tool, and "
            "this documentation-grounded AI assistant, all behind role-based access control. "
            "The backend is a FastAPI service backed by PostgreSQL; the frontend is a React "
            "single-page application served through the same origin as the API, so it works "
            "reasonably well even on the flaky connectivity sometimes found at a rig site."
        ),
    ),
]
