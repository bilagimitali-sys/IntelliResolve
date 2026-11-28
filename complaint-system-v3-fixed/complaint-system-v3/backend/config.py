"""Application configuration loaded from backend/.env."""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
DB_USER: str = os.getenv("DB_USER", "root")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
DB_NAME: str = os.getenv("DB_NAME", "complaint_db")

JWT_SECRET: str = os.getenv(
    "JWT_SECRET",
    "kle_tech_grievance_platform_super_secret_key_2025",
)
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_DAYS: int = 7

PORT: int = int(os.getenv("PORT", "5000"))
CLIENT_URL: str = os.getenv("CLIENT_URL", "http://localhost:3000")

EMAIL_USER: str = os.getenv("EMAIL_USER", "")
EMAIL_PASS: str = os.getenv("EMAIL_PASS", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

UPLOAD_DIR: Path = BASE_DIR / "uploads"
VOICE_UPLOAD_DIR: Path = UPLOAD_DIR / "voice"
BUS_UPLOAD_DIR: Path = UPLOAD_DIR / "bus_attachments"
