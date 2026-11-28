"""Authentication and Admin Coordinator/User Management router."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import config
import db
from dependencies.auth import admin_only, get_current_user

router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = "student"
    department: str | None = None
    department_id: int | str | None = None


class LoginRequest(BaseModel):
    email: str | None = None
    password: str | None = None


class CreateCoordinatorRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    department_id: int | str | None = None


class UserStatusRequest(BaseModel):
    is_active: Any = None


def _parse_optional_int(value: int | str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest) -> dict[str, str]:
    name = (body.name or "").strip()
    email = (body.email or "").strip().lower()
    password = body.password or ""

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if body.role in ("admin", "bus_coordinator", "department_coordinator", "staff"):
        raise HTTPException(
            status_code=403,
            detail="Administrative and coordinator accounts can only be provisioned by System Administrators.",
        )

    safe_role = "faculty" if body.role == "faculty" else "student"

    existing = await db.query_all("SELECT user_id FROM users WHERE email = %s", (email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")

    resolved_dept_id = _parse_optional_int(body.department_id)
    resolved_dept_name = (body.department or "").strip() or None

    if resolved_dept_id and not resolved_dept_name:
        dept = await db.query_one("SELECT name FROM departments WHERE id = %s", (resolved_dept_id,))
        if dept:
            resolved_dept_name = dept["name"]
    elif resolved_dept_name and not resolved_dept_id:
        dept = await db.query_one(
            "SELECT id FROM departments WHERE name = %s OR code = %s",
            (resolved_dept_name, resolved_dept_name),
        )
        if dept:
            resolved_dept_id = dept["id"]

    await db.execute(
        """
        INSERT INTO users (name, email, password, role, department, department_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """,
        (name, email, hashed, safe_role, resolved_dept_name, resolved_dept_id),
    )

    return {"message": "Account created successfully. Please log in."}


@router.post("/login")
async def login(body: LoginRequest) -> dict[str, Any]:
    email = (body.email or "").strip().lower()
    password = body.password or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = await db.query_one(
        """
        SELECT u.*, d.name AS dept_name, d.code AS dept_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.email = %s
        """,
        (email,),
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        password_ok = bcrypt.checkpw(password.encode("utf-8"), str(user["password"]).encode("utf-8"))
    except Exception:
        password_ok = False

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Account is disabled. Please contact System Administrator.",
        )

    user_payload = {
        "user_id": user["user_id"],
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "department": user.get("department") or user.get("dept_name"),
        "department_id": user.get("department_id"),
        "department_code": user.get("dept_code"),
    }

    token_claims = {
        **user_payload,
        "exp": datetime.now(timezone.utc) + timedelta(days=config.JWT_EXPIRE_DAYS),
    }
    token = jwt.encode(token_claims, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)

    return {"token": token, "user": user_payload}


@router.get("/me")
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    row = await db.query_one(
        """
        SELECT u.user_id, u.name, u.email, u.role, u.department, u.department_id,
               d.name AS department_name, d.code AS department_code, d.icon AS department_icon,
               u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.user_id = %s
        """,
        (current_user["user_id"],),
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row


@router.post("/admin/coordinators", status_code=status.HTTP_201_CREATED)
@router.post("/coordinators", status_code=status.HTTP_201_CREATED)
@router.post("/admin/create-staff", status_code=status.HTTP_201_CREATED)
@router.post("/create-staff", status_code=status.HTTP_201_CREATED)
async def create_coordinator(
    body: CreateCoordinatorRequest,
    _: dict[str, Any] = Depends(admin_only),
) -> JSONResponse:
    name = (body.name or "").strip()
    email = (body.email or "").strip().lower()
    password = body.password or ""
    role = body.role or ""
    dept_id = _parse_optional_int(body.department_id)

    if not name or not email or not password or not role:
        raise HTTPException(
            status_code=400,
            detail="Name, email, temporary password, and role are required",
        )

    if role not in ("department_coordinator", "bus_coordinator", "staff", "faculty"):
        raise HTTPException(status_code=400, detail="Invalid coordinator role selected")

    if role == "department_coordinator" and not dept_id:
        raise HTTPException(
            status_code=400,
            detail="Please select a department for the Department Coordinator",
        )

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await db.query_all("SELECT user_id FROM users WHERE email = %s", (email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    dept_name = None
    if dept_id:
        dept = await db.query_one("SELECT name FROM departments WHERE id = %s", (dept_id,))
        if dept:
            dept_name = dept["name"]

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
    user_id, _ = await db.execute(
        """
        INSERT INTO users (name, email, password, role, department, department_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """,
        (name, email, hashed, role, dept_name, dept_id),
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "Coordinator account created successfully.",
            "user_id": user_id,
        },
    )


@router.get("/admin/users")
@router.get("/users")
async def list_users(
    role: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _: dict[str, Any] = Depends(admin_only),
) -> list[dict[str, Any]]:
    sql = """
      SELECT u.user_id, u.name, u.email, u.role, u.department, u.department_id,
             d.name AS department_name, d.code AS department_code, u.is_active, u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    """
    params: list[Any] = []
    if role:
        sql += " AND u.role = %s"
        params.append(role)
    if search:
        sql += " AND (u.name LIKE %s OR u.email LIKE %s OR u.department LIKE %s)"
        like_term = f"%{search}%"
        params.extend([like_term, like_term, like_term])

    sql += " ORDER BY u.created_at DESC"
    return await db.query_all(sql, params)


@router.put("/admin/users/{user_id}/status")
@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    body: UserStatusRequest,
    _: dict[str, Any] = Depends(admin_only),
) -> dict[str, str]:
    if not isinstance(body.is_active, bool):
        raise HTTPException(status_code=400, detail="is_active boolean is required")

    await db.execute("UPDATE users SET is_active = %s WHERE user_id = %s", (body.is_active, user_id))
    state_label = "activated" if body.is_active else "disabled"
    return {"message": f"User account has been {state_label}"}
