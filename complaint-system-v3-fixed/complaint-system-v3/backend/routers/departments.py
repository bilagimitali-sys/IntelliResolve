"""Departments router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

import db
from dependencies.auth import admin_or_faculty, get_current_user

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("")
@router.get("/")
async def list_departments() -> list[dict[str, Any]]:
    """Return all KLE Tech departments ordered alphabetically."""
    return await db.query_all("SELECT * FROM departments ORDER BY name ASC")


@router.get("/{dept_id}")
async def get_department(
    dept_id: int,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    dept = await db.query_one("SELECT * FROM departments WHERE id = %s", (dept_id,))
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.get("/{dept_id}/complaints")
async def get_department_complaints(
    dept_id: int,
    _: dict[str, Any] = Depends(admin_or_faculty),
) -> list[dict[str, Any]]:
    return await db.query_all(
        """
        SELECT c.*, u.name AS student_name, u.email AS student_email
        FROM complaints c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.department_id = %s
        ORDER BY c.created_at DESC
        """,
        (dept_id,),
    )
