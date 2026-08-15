# UndisputedWell — Project Plan

## Architecture decision

**Frontend: React + TypeScript + Vite** (not Next.js).

Justification, derived from the actual requirements rather than framework popularity:
- No public/marketing surface — everything is behind a login wall. This removes the only
  scenario (SEO, public pages) that would justify Next.js.
- Auth is a session cookie, checked and enforced server-side by FastAPI on every API call.
  A CSR app can gate routes client-side and redirect on 401 just as well as SSR can —
  Next.js's "check auth before rendering on the server" advantage doesn't apply here.
- Deployment is a static build behind Nginx in Docker Compose. No SSR/RSC means no reason
  to run a persistent Node process in production.
- Usage happens partly at rig sites with imperfect connectivity. SSR requires a live
  round-trip to a server on every navigation; a CSR SPA with a persisted TanStack Query
  cache degrades better under flaky connections than SSR does.

FastAPI remains the sole source of truth for authentication, authorization/RBAC, business
logic, well/rig management, operations, asphaltene prediction, threshold calculations, AI/RAG,
and all database access. The frontend never re-implements backend business logic.

```
React (Vite) static build
        │
   Nginx reverse proxy (same-origin)
   /          → static SPA
   /api/*     → FastAPI
        │
     FastAPI  (auth, RBAC, business logic, well/rig mgmt, ops,
                asphaltene prediction, thresholds, AI/RAG, DB access)
        │
     PostgreSQL
```

## Key architectural decisions (from stress-testing the plan)

| Area | Decision |
|---|---|
| Auth transport | httpOnly, Secure, `SameSite=Strict` session cookie |
| Origin topology | Same-origin via a single Nginx reverse proxy — no CORS surface |
| CSRF | Double-submit CSRF token required on mutating endpoints |
| Data layer | TanStack Query, persisted cache + retry/backoff for connectivity dropouts |
| Real-time | Polling for general dashboard data; SSE stream for threshold-breach alerts |
| UI kit | MUI for chrome/forms/tables + a dedicated charting library for prediction/telemetry viz |
| Forms/validation | React Hook Form + Zod, kept UI-only (required/format/range). FastAPI/Pydantic is the sole business-rule authority; server 422s are the final word — Zod is never a re-implementation of backend rules |
| Authorization model | Generic `usePermission('resource:action')` hook backed by a permissions array returned at login. Frontend gates are UX convenience only; FastAPI enforces |
| Client state | No global store initially — URL search-params for shareable filter state, local component state otherwise. Add Zustand only if a concrete cross-page need appears |
| Deployment | Docker Compose; frontend is a multi-stage build (Node build stage → static Nginx serve stage), no persistent Node/SSR process |

## Frontend stack

React · TypeScript · Vite · Material UI · TanStack Query · React Router · React Hook Form · Zod

## Testing stack

Jest + React Testing Library + Istanbul coverage (components, forms, validation, role-based
rendering, API states, loading states, error states, empty states, user interactions,
permission-dependent UI) + Playwright for end-to-end RBAC/auth flows that component tests
can't reach.

## Milestones

### M0 — Foundations
Repo/Docker Compose skeleton: FastAPI (health check, Alembic, PostgreSQL), React+Vite+TS+MUI
shell, Nginx reverse proxy (`/api/*` → FastAPI, same-origin), Jest+RTL+Istanbul config,
Playwright installed, pytest installed.
**Tests:** shell-renders smoke test (frontend), health-check test (backend), Compose `up` smoke test.

### M1 — Authentication & Session
Backend: user model, login/logout, httpOnly/Secure/SameSite=Strict session cookie, CSRF
double-submit token, permissions array on login.
Frontend: login page/form, `usePermission()` hook, route-guard wrapper, auth context.
**Tests:** login form (render/validation/submit states), loading/error/empty states, route
guard permission tests, Playwright e2e (login success/failure, session survives reload,
logout, CSRF-protected mutation rejected without token).

### M2 — Well & Rig Management (CRUD baseline)
Backend: Well/Rig models, RBAC-protected CRUD endpoints.
Frontend: list/detail views (MUI tables), create/edit forms (RHF+Zod), TanStack Query hooks
with cache invalidation.
**Tests:** table/list states (loading skeleton, empty, error, populated), create/edit form
validation, permission-dependent UI (edit/delete hidden per role), sort/filter interaction,
Playwright e2e (full CRUD as authorized role; lower-permission role blocked from UI *and*
direct URL).

### M3 — Operations & Threshold Calculations
Backend: operations endpoints, threshold logic, SSE stream for threshold-breach alerts.
Frontend: ops dashboard, threshold config forms, SSE client hook, breach alert UI.
**Tests:** threshold indicator states (normal/warning/breach), SSE hook (connect/receive/
reconnect, mocked EventSource), alert dismiss interaction, config form validation, Playwright
e2e (trigger a breach on the backend, assert live alert in the browser).

### M4 — Asphaltene Prediction
Backend: prediction endpoint.
Frontend: prediction input form, results chart.
**Tests:** form validation/submit states, chart renders with data / empty state, Playwright
e2e (input → chart-rendered flow).

### M5 — AI/RAG Integration
Backend: RAG query endpoint (streaming).
Frontend: AI assistant panel, streaming message rendering.
**Tests:** message list rendering, streaming/loading/error/empty states, permission-gated
visibility, Playwright e2e (ask → streamed answer).

### M6 — Cross-cutting hardening
Persisted-cache/retry behavior verified under simulated offline/reconnect; full
`usePermission()` audit across every route and conditional control; global error boundary,
404 page, empty-state audit; Istanbul coverage gate enforced in CI (build fails below
threshold).

### M7 — CI/CD & deploy readiness
Pipeline: Jest+RTL with Istanbul coverage gate → Playwright (headless) → pytest →
`docker compose build && up` smoke test.

## Coverage guarantee — required category → where it's tested

| Required category | Covered in |
|---|---|
| Components | M0, M2, M3, M4, M5 |
| Forms | M1, M2, M3, M4 |
| Validation | M1, M2, M4 |
| Role-based rendering | M2, M5 |
| Permission-dependent UI | M1, M2, M5, audited fully in M6 |
| API states (loading/error/success) | M2, M3 |
| Loading states | M1, M2 |
| Error states | M1, M2, M4 |
| Empty states | M2, M4, M5 |
| User interactions | M1, M2, M3 |
| Playwright e2e (role × route matrix) | M1–M5 individually, consolidated in M6 |

## Execution status

- [x] M0 — Foundations (verified end-to-end via `docker compose up`: postgres/backend/web all healthy, `/api/health` reachable through the Nginx proxy, frontend Jest suite 100% coverage, backend pytest 86% coverage, Playwright smoke e2e passing)
- [x] M1 — Authentication & Session (verified end-to-end on a from-zero `docker compose down -v && up`: Alembic migration applies cleanly, admin user seeded via `scripts.seed_admin`, login/logout/me/CSRF/RBAC all working through the real Nginx→FastAPI→Postgres path. Backend pytest 18/18 passing, 94% coverage. Frontend Jest 38/38 passing, 100% coverage across every file touched. Playwright e2e 6/6 passing: login success/failure, session survives reload, logout, CSRF-rejected mutation with valid session)
- [x] M2 — Well & Rig Management (verified end-to-end on a from-zero `docker compose down -v && up`: rigs/wells Alembic migration applies cleanly on top of M1's, admin + viewer seeded via `scripts.seed_user`, full CRUD for both resources working through the real Nginx→FastAPI→Postgres path including search/filter/sort, RBAC enforcement (viewer read-only, engineer edit-not-delete, admin full), and a rig delete correctly nullifying its wells' `rig_id`. Backend pytest 52/52 passing, 93% coverage. Frontend Jest 103/103 passing, 99.6% statement / 100% line coverage across every file touched. Playwright e2e 10/10 passing (5 from M1 + 4 new CRUD/permission-blocked-URL tests + 1 smoke))
- [x] M3 — Operations & Threshold Calculations (verified end-to-end on a from-zero `docker compose down -v && up`: operations Alembic migration applies cleanly on top of M2's, threshold evaluation (normal/warning/breach against independently-optional warning/critical bands) working through the real Nginx→FastAPI→Postgres path, SSE alert stream verified live in a real browser via Playwright — including fixing a real nginx proxied-streaming bug (`proxy_buffering` was holding back the whole response) and adding an SSE keepalive heartbeat so `proxy_read_timeout` doesn't kill a quiet connection. Backend pytest 75/75 passing, 89% coverage (the SSE route's generator body is untestable under Starlette's TestClient — it fully drains a response before returning, so a live-forever stream can never return control — and is covered instead by the real-browser Playwright test; the polling logic underneath it is unit-tested directly). Frontend Jest 148/148 passing, 99%+ coverage across every file touched, including a mocked-EventSource test of the SSE hook (connect/open/error/message/reconnect-stability/unmount). Playwright e2e 12/12 passing (9 from M1/M2 + 2 new operations tests + smoke): breach-to-live-alert round trip and RBAC-gated operations UI)
- [x] M4 — Asphaltene Prediction (verified end-to-end on a from-zero `docker compose down -v && up`: predictions Alembic migration applies cleanly on top of M3's, the screening model (Standing's 1947 bubble-point correlation + a resin/asphaltene-ratio-driven instability envelope — documented in services/predictions.py as a heuristic, not a validated PVT simulator) computes deterministically and is golden-value tested, `@mui/x-charts` LineChart renders the instability-vs-pressure curve, RBAC enforced (well:edit to run, well:read to view history) and a well delete cascades to remove its predictions. Along the way: fixed a real MUI v9 `Stack`+`alignItems` typing break (same class of bug as M1 — switched to `Box`+flex `sx`) and a jest-environment-jsdom gap (`structuredClone` isn't a global there; `@mui/x-charts` needs it — polyfilled in test setup). Backend pytest 96/96 passing, 91% coverage. Frontend Jest 167/167 passing, 99%+ coverage across every file touched. Playwright e2e 14/14 passing (12 from M1–M3 + 2 new prediction tests): full run→chart→history→reselect flow and RBAC-gated access)
- [x] M5 — AI/RAG Integration (verified end-to-end on a from-zero `docker compose down -v && up`: no new migration needed. The assistant is a real, self-contained retrieval pipeline grounded in a small in-repo knowledge base about the platform's own features — TF-IDF + cosine-similarity retrieval (implemented from scratch, no embedding API available in this environment) followed by extractive sentence-level answer synthesis, streamed to the browser word-by-word over a finite SSE-framed response via `fetch()`+`ReadableStream` (not `EventSource` — it can't carry a POST body and auto-reconnects a closed connection, wrong for a one-shot answer). Honestly declines to answer when nothing in the corpus matches, rather than guessing. `ai:query` is granted to every role (viewers included), enforced by the backend and route-gated on the frontend via the existing `RequirePermission`. Along the way: found and fixed a genuine `jest-environment-jsdom` gap (`structuredClone` isn't a global there, unlike real browsers/Node — `@mui/x-charts` from M4 needed it; the M5 chart tests exposed it), and a real Playwright text-matching bug (`getByText("Thresholds")` ambiguously matched an M3 empty-state message containing the substring "thresholds" — latent since M3, only surfaced now). Backend pytest 121/121 passing, 92% coverage, including a fully-consumed streaming-response test (this stream terminates, unlike M3's — no TestClient limitation here). Frontend Jest 188/188 passing, 99%+ coverage. Playwright e2e 16/16 passing (14 prior + 2 new): full ask→stream→sourced-answer flow and an honest no-match response)
- [x] M6 — Cross-cutting hardening (verified end-to-end on a from-zero `docker compose down -v && up`: no new migration. **Persisted cache**: wired `PersistQueryClientProvider` (`@tanstack/react-query-persist-client` + `query-sync-storage-persister`, localStorage, 24h max age); `networkMode: "online"` means cached data still renders instantly offline while retries pause, and TanStack auto-resumes on reconnect (verified via `onlineManager.setOnline()`, not real network mocking). **Two real, reproducible races found and fixed** while wiring this up, both only visible via real-browser e2e (not caught by jsdom unit tests): (1) `PersistQueryClientProvider` holds queries back until restore-from-storage completes, and `AuthContext`'s `isLoading` didn't account for that gap, so `ProtectedRoute` could redirect to `/login` before the real session check ever ran — fixed by folding `useIsRestoring()` into `AuthContext`'s loading state; (2) the persister's own auto-persist is throttled (~1s), so a hard navigation immediately after login/logout could restore an auth snapshot from *before* that write flushed — fixed by excluding `auth/me` from persistence entirely (`shouldPersistQuery`) rather than chasing the throttle, since auth's real source of truth is the session cookie, not this cache; logout also now does `removeQueries` (not `me`) + explicit `persister.removeClient()` so a different user's browser session doesn't inherit stale cached business data. **Permission audit**: cross-referenced every `require_permission(...)` in the backend against every `usePermission(...)`/`RequirePermission` in the frontend — all consistent, no mismatches (`well:read`/`rig:read` universal and ungated; `well:edit`/`rig:edit`/`threshold:configure` gate the matching create/edit controls and routes; `well:delete`/`rig:delete` gate the matching Delete buttons; `ai:query` gates `/assistant`; the SSE alert stream and alert-acknowledge intentionally require only authentication, matching `well:read` being universal). **Error boundary + 404**: added a class-component `ErrorBoundary` (render errors are unrecoverable without one — no hook equivalent exists) and a catch-all `NotFound` route. **Empty-state audit**: every list/chart/history view already had a proper empty state from M2–M5; added the one real gap found — Operations/Predictions pages showed nothing but the well selector before a well was chosen. **Coverage gate**: confirmed already-enforced, not just configured — Jest's `coverageThreshold` (80/70/80/80) and pytest's `fail_under = 80` have caused a real failure and correction at least once each across M1–M6; wiring them into an actual CI runner is M7's job. Backend pytest 121/121 passing, 92% coverage (unchanged — M6 was frontend-only). Frontend Jest 204/204 passing, 98%+ coverage across every file touched. Playwright e2e 16/16 passing, confirmed clean across 4 consecutive full-suite runs including the fresh-stack run — the auth-persistence race reproduced reliably before the fix and did not reproduce after)
- [x] M7 — CI/CD & deploy readiness (the project entered version control this milestone — see the initial commit for the full M0–M6 history captured at once, and this milestone's own commit for what follows. **CI**: `.github/workflows/ci.yml` runs Jest+coverage-gate and pytest+coverage-gate as fast Docker-free jobs, then a Docker Compose job that builds/starts the real stack (`docker compose up -d --build --wait`) and runs Playwright against it headlessly — the stack reaching healthy at all *is* the "docker compose build && up" smoke test PLAN.md called for. Found and fixed a real bug testing `--wait` locally, not just writing the YAML and hoping: the web service's healthcheck used `localhost`, which BusyBox `wget` resolved to `::1` first with no IPv6 listener configured, so it never passed — added `listen [::]:80` and pointed the healthcheck at `127.0.0.1`. **Deploy readiness**: Postgres credentials and the web port are now environment-overridable (`.env.example`) instead of hardcoded, all three services get `restart: unless-stopped`, and a genuinely dead, insecure-default `session_secret_key` setting was removed (sessions/CSRF tokens are opaque `secrets.token_urlsafe` values checked against the database, never signed — there was never actually a secret to manage, just unused M1 scaffolding). README gained a Deployment section (secrets, TLS, backups, migrations, restart/resource limits, bundle size) and the stray default-Vite-scaffold `frontend/README.md` was replaced with a real pointer. Final from-zero verification (`docker compose down -v && up -d --build --wait`): backend pytest 121/121, 92% coverage; frontend Jest 204/204, 98%+ coverage; Playwright e2e 16/16; all three healthchecks green including the newly-fixed one. This completes all eight milestones, M0 through M7)

## Post-M7 additions

- **Dark mode** (user request, post-plan): `ThemeModeProvider` — follows OS `prefers-color-scheme` live until the user picks explicitly via the NavBar toggle, then persists that choice to localStorage and stops following the OS. `CssBaseline enableColorScheme` so native browser widgets match too, not just MUI's own components. Consolidated what was three separately-wired providers (QueryClient/Theme/CssBaseline in App.tsx and in the test helper) into this one provider. jsdom doesn't implement `matchMedia` at all — polyfilled in `setupTests.ts` (same class of gap as `ResizeObserver`/`structuredClone` from M4/M5). Verified end-to-end on a from-zero `docker compose down -v && up --build --wait`: backend pytest 121/121, frontend Jest 213/213 (98%+ coverage), Playwright e2e 17/17 including a new `dark-mode.spec.ts` (OS-follow → explicit override → persists across reload), plus a manual visual check in a real browser.

## UI Redesign milestones

The current UI works but looks generic (default MUI + a leftover default-Vite favicon that says nothing about oil & gas). Goal: a distinctive, "futuristic" visual identity that's still grounded in what this product actually is — an industrial well/rig telemetry platform — not generic sci-fi dressing. Starting with the login page per explicit instruction; later milestones extend the same system to the rest of the app. Each milestone gets its own from-zero verification (Jest + Playwright + a real visual check) before moving to the next, matching every prior milestone's discipline.

### UI0 — Design foundation
Token system (color, type) that the rest of the redesign builds on, validated as a standalone visual preview before touching real app code. Palette: keep the existing blue as primary (continuity), add an amber/copper "instrumentation" accent (gauges, warning lamps — distinct from the generic blue-purple SaaS gradient the AI-design-defaults tend toward) for telemetry-flavored decoration; dark-first, full light-theme pair. Type: Rajdhani (display/headings — technical/HUD character without tipping into sci-fi cliché) + IBM Plex Sans (body/UI — legible, engineering heritage) + IBM Plex Mono (small telemetry-style captions), embedded as real `@font-face` data URIs, not a CDN link. Favicon: a minimal derrick mark, replacing the untouched default Vite icon.
**Tests:** none yet (visual-only artifact preview) — real component/e2e coverage starts at UI1 once tokens land in the actual codebase (`theme.ts` / `ThemeModeProvider`).

### UI1 — Login page redesign
Layered animated background — aurora glow blobs (soft, blurred, drifting) beneath topographic contour lines (slow seamless horizontal drift) — behind the existing login card, restyled with the UI0 tokens/type. Adds the dark/light toggle to the login page itself (today it only exists in the authenticated NavBar, so an unauthenticated visitor has no way to switch it). Respects `prefers-reduced-motion`.
**Tests:** existing Login component tests + new ones for the login-page theme toggle, Playwright e2e (toggle present and working pre-auth, existing login-flow specs still pass unmodified), manual visual check in both themes.

### UI2 — Dashboard redesign
The "cool and futuristic" treatment for the authenticated shell (NavBar + Dashboard) — scope to be pinned down in its own design conversation before implementation, the same way UI0/UI1 were, rather than guessed at up front.
**Tests:** Dashboard/NavBar component tests updated for whatever changes, full e2e suite still green (NavBar is shared chrome for every page — a regression here breaks everything downstream), manual visual check.

### UI3 — Redesign rollout to remaining pages
Extend the UI0 design system to Rigs, Wells, Operations, Predictions, and the Assistant once it's proven out on login + dashboard. Scope TBD after UI1/UI2 land and the direction is validated with real usage.
**Tests:** full Jest + Playwright suite, page by page, matching the coverage discipline of every prior milestone.

### Execution status
- [ ] UI0 — Design foundation
- [ ] UI1 — Login page redesign
- [ ] UI2 — Dashboard redesign
- [ ] UI3 — Redesign rollout to remaining pages
