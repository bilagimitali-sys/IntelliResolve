"""
KLE Technological University — Grievance Management Platform v4
Python + FastAPI + Socket.IO ASGI Entrypoint
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import socketio
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

import config
import db
from routers import ai, analytics, auth, bus_complaints, complaints, departments, notifications
from socket_manager import sio


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config.VOICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config.BUS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    db.test_connection()
    print("\n====================================================")
    print("🏛️  KLE Technological University — Grievance Management Platform")
    print(f"🚀 FastAPI server listening on http://localhost:{config.PORT}")
    print(f"📁 Upload storage: http://localhost:{config.PORT}/uploads")
    print("🔌 Socket.IO initialized (rooms: user_*, role_*, dept_*)")
    print("====================================================\n")
    yield


fastapi_app = FastAPI(
    title="KLE Tech Grievance Management Platform API",
    version="4.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── ERROR HANDLERS (matching frontend's `{ error: ... }` shape) ──
@fastapi_app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404 and exc.detail == "Not Found":
        return JSONResponse(
            status_code=404,
            content={"error": f"Route not found: {request.method} {request.url.path}"},
        )
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@fastapi_app.exception_handler(HTTPException)
async def fastapi_http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@fastapi_app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_err = exc.errors()[0] if exc.errors() else {"msg": "Invalid request payload"}
    return JSONResponse(status_code=400, content={"error": first_err.get("msg", "Invalid request payload")})


@fastapi_app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    print(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"error": str(exc) or "Internal server error"})


# ── STATIC UPLOADS ────────────────────────────────────────────
config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
config.VOICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
config.BUS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=str(config.UPLOAD_DIR)), name="uploads")


# ── API ROUTERS ───────────────────────────────────────────────
fastapi_app.include_router(auth.router, prefix="/api/auth")
fastapi_app.include_router(auth.router, prefix="/api/admin")
fastapi_app.include_router(complaints.router)
fastapi_app.include_router(bus_complaints.router)
fastapi_app.include_router(ai.router)
fastapi_app.include_router(notifications.router)
fastapi_app.include_router(analytics.router)
fastapi_app.include_router(departments.router)


# ── HEALTH CHECK ──────────────────────────────────────────────
@fastapi_app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "HEALTHY",
        "system": "KLE Tech Grievance Platform v4 (FastAPI)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Wrap FastAPI with Socket.IO ASGI app so `uvicorn main:app` serves both HTTP and Socket.IO
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=False)
