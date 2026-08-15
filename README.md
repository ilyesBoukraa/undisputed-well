# UndisputedWell

See [PLAN.md](./PLAN.md) for the architecture decision, milestones, and test-coverage plan.

## Run everything

```
docker compose up --build
```

- App: http://localhost:8080
- API health check: http://localhost:8080/api/health

**Production note:** the session cookie is `Secure` (see PLAN.md auth decision), so real
browsers will only send it back over HTTPS. This local Compose setup terminates plain HTTP on
Nginx for simplicity — production deployments must put a TLS-terminating proxy/load balancer
in front of it. (`SESSION_COOKIE_SECURE=false` can be set for a non-HTTPS local override if
ever needed, but the default is intentionally the secure behavior.)

## Local development

Backend:
```
cd backend
python -m venv .venv
.venv/Scripts/activate   # or .venv/bin/activate on macOS/Linux/MSYS
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```
cd frontend
npm install
npm run dev
```

## Tests

```
cd backend && pytest --cov=app --cov-report=term-missing
cd frontend && npm run test:coverage
cd frontend && npm run test:e2e   # requires the stack running via docker compose
```

### Seed a user

There is no public signup endpoint — everything is behind a login wall (see PLAN.md) — so
provision the first user manually. The e2e auth suite expects this exact admin account to exist:

```
docker compose exec backend python -m scripts.seed_admin admin@undisputedwell.dev "correct horse battery staple"
```

The M2/M3 e2e suites additionally expect a viewer account, provisioned with the more general `seed_user` script:

```
docker compose exec backend python -m scripts.seed_user viewer@undisputedwell.dev "correct horse battery staple" viewer
```
