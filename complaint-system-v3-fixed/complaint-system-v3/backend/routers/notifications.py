"""Notifications router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

import db
from dependencies.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
@router.get("/")
async def list_notifications(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return await db.query_all(
        """
        SELECT n.*, c.title AS complaint_title
        FROM notifications n
        LEFT JOIN complaints c ON n.complaint_id = c.complaint_id
        WHERE n.user_id = %s
        ORDER BY n.sent_at DESC
        LIMIT 20
        """,
        (current_user["user_id"],),
    )


# /read-all/all must be registered before /{notif_id}/read
@router.put("/read-all/all")
async def mark_all_read(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    await db.execute(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
        (current_user["user_id"],),
    )
    return {"message": "All notifications marked as read"}


@router.put("/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    await db.execute(
        "UPDATE notifications SET is_read = TRUE WHERE notif_id = %s AND user_id = %s",
        (notif_id, current_user["user_id"]),
    )
    return {"message": "Marked as read"}
