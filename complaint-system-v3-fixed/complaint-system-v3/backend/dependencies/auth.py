"""JWT authentication and role-based access control dependencies."""

from __future__ import annotations

from typing import Any, Callable

import jwt
from fastapi import Depends, HTTPException, Request, status

import config


async def get_current_user(request: Request) -> dict[str, Any]:
    """Validate Bearer JWT token and return decoded user payload."""
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def require_roles(*allowed_roles: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Return a FastAPI dependency enforcing an allow-list of roles."""

    async def _guard(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        role = user.get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Authorized roles: {', '.join(allowed_roles)} "
                    f"(Your role: {role or 'none'})"
                ),
            )
        return user

    return _guard


admin_only = require_roles("admin")
student_only = require_roles("student")
bus_coordinator_only = require_roles("bus_coordinator", "admin")
dept_coordinator_only = require_roles("department_coordinator", "faculty", "staff", "admin")
admin_or_faculty = require_roles("admin", "staff", "faculty", "department_coordinator")
