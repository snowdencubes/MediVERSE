import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import kiosk, queue, doctor, health, auth, receptionist
from app.core.database import init_db
from app.services.sync_service import start_sync_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    start_sync_service()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
from app.routers import kiosk, queue, doctor, health, auth, receptionist, settings as settings_router, ai

app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(kiosk.router, prefix=settings.API_V1_STR)
app.include_router(queue.router, prefix=settings.API_V1_STR)
app.include_router(doctor.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(receptionist.router, prefix=f"{settings.API_V1_STR}/receptionist")
app.include_router(settings_router.router, prefix=f"{settings.API_V1_STR}/settings")
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}")

import os
from fastapi.staticfiles import StaticFiles

if os.path.isdir("frontend_out"):
    app.mount("/", StaticFiles(directory="frontend_out", html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to rekov API (Frontend missing)",
            "docs": "/docs",
            "health": f"{settings.API_V1_STR}/health"
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
