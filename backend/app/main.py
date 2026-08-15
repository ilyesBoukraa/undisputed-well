from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.operations import router as operations_router
from app.api.predictions import router as predictions_router
from app.api.rigs import router as rigs_router
from app.api.wells import router as wells_router
from app.core.config import settings
from app.core.csrf import CSRFMiddleware

app = FastAPI(title=settings.app_name)
app.add_middleware(CSRFMiddleware)

# Same-origin deployment via the Nginx reverse proxy (see /nginx/nginx.conf) means CORS
# is not needed in production. This is left in only to unblock local frontend dev servers
# that talk to the API directly instead of through the proxy.
if settings.cors_allow_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(rigs_router, prefix="/api")
app.include_router(wells_router, prefix="/api")
app.include_router(operations_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
