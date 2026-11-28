"""Transportation (Bus) complaints router."""

from __future__ import annotations

import random
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import config
import db
from dependencies.auth import bus_coordinator_only, get_current_user, student_only
from socket_manager import emit_to_rooms

router = APIRouter(prefix="/api/bus-complaints", tags=["bus-complaints"])

MAX_BUS_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB per image
_ALLOWED_BUS_IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}
_ALLOWED_BUS_IMG_MIME = re.compile(r"image/(jpeg|jpg|png|webp)", re.IGNORECASE)
_VALID_TYPES = ("delay", "driver_behaviour", "cleanliness", "maintenance", "route_issue", "overcrowding", "safety")
_VALID_STATUSES = ("Received", "Under Review", "Assigned", "In Progress", "Resolved", "Escalated")


class BusStatusRequest(BaseModel):
    status: str | None = None
    remarks: str | None = None


class BusAssignRequest(BaseModel):
    assigned_to: int | None = None
    remarks: str | None = None


class BusEscalateRequest(BaseModel):
    escalation_reason: str | None = None


class BusRespondRequest(BaseModel):
    message: str | None = None
    is_internal: bool = False


def _ensure_bus_upload_dir() -> None:
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config.BUS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _parse_optional_int(value: str | None) -> int | None:
    if not value or not value.strip():
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _parse_datetime(value: str | None) -> datetime:
    if not value or not value.strip():
        return datetime.now()
    clean = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return datetime.now()


@router.get("/buses")
async def list_buses(_: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return await db.query_all("SELECT * FROM buses WHERE is_active = TRUE ORDER BY bus_number ASC")


@router.get("/routes")
async def list_routes(_: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return await db.query_all("SELECT * FROM routes WHERE is_active = TRUE ORDER BY route_number ASC")


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bus_complaint(
    bus_id: str = Form(""),
    route_id: str = Form(""),
    complaint_type: str = Form(""),
    title: str = Form(""),
    description: str = Form(""),
    original_description: str = Form(""),
    incident_datetime: str = Form(""),
    priority: str = Form("Medium"),
    is_safety_hazard: str = Form("false"),
    attachments: list[UploadFile] = File(default=[]),
    current_user: dict[str, Any] = Depends(student_only),
) -> JSONResponse:
    if not complaint_type or complaint_type not in _VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid complaint type. Allowed: {', '.join(_VALID_TYPES)}",
        )

    if not title.strip() or not description.strip():
        raise HTTPException(status_code=400, detail="Title and description are required")

    valid_uploads = [f for f in attachments if f and f.filename]
    if len(valid_uploads) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 attachments allowed.")

    _ensure_bus_upload_dir()
    saved_files: list[tuple[str, str, str, int]] = []
    for upload in valid_uploads:
        ext = Path(upload.filename or "").suffix.lower()
        mime_ok = bool(_ALLOWED_BUS_IMG_MIME.search(upload.content_type or ""))
        if ext not in _ALLOWED_BUS_IMG_EXT or not mime_ok:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Only JPG, PNG, and WebP images are allowed.",
            )
        data = await upload.read()
        if len(data) > MAX_BUS_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB per image.")
        unique_name = f"bus-{int(time.time() * 1000)}-{random.randint(0, 10**9)}{ext}"
        dest = config.BUS_UPLOAD_DIR / unique_name
        dest.write_bytes(data)
        saved_files.append((f"bus_attachments/{unique_name}", upload.filename or unique_name, upload.content_type or "image/jpeg", len(data)))

    is_safety = 1 if (is_safety_hazard.strip().lower() in ("true", "1") or complaint_type == "safety") else 0
    resolved_priority = "High" if is_safety else (priority.strip() or "Medium")
    incident_dt = _parse_datetime(incident_datetime)
    orig_desc = (original_description or description).strip()

    bus_complaint_id, _ = await db.execute(
        """
        INSERT INTO bus_complaints
          (user_id, bus_id, route_id, complaint_type, title, description, original_description,
           incident_datetime, priority, status, is_safety_hazard)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Received', %s)
        """,
        (
            current_user["user_id"],
            _parse_optional_int(bus_id),
            _parse_optional_int(route_id),
            complaint_type,
            title.strip(),
            description.strip(),
            orig_desc,
            incident_dt,
            resolved_priority,
            is_safety,
        ),
    )

    for stored_name, orig_name, mime_type, size in saved_files:
        await db.execute(
            """
            INSERT INTO bus_complaint_attachments
              (bus_complaint_id, filename, original_name, mime_type, file_size)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (bus_complaint_id, stored_name, orig_name, mime_type, size),
        )

    await db.execute(
        """
        INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, new_status, notes)
        VALUES (%s, %s, 'CREATED', 'Received', 'Grievance submitted by student')
        """,
        (bus_complaint_id, current_user["user_id"]),
    )

    alert_prefix = "🚨 SAFETY ALERT: " if is_safety else ""
    notif_text = f'{alert_prefix}New Bus Complaint #{bus_complaint_id} [{complaint_type.upper()}]: "{title.strip()}"'
    await db.execute(
        """
        INSERT INTO notifications (user_id, complaint_id, message)
        SELECT user_id, NULL, %s FROM users WHERE role IN ('bus_coordinator', 'admin')
        """,
        (notif_text,),
    )

    await emit_to_rooms(
        "newBusComplaint",
        {
            "bus_complaint_id": bus_complaint_id,
            "title": title.strip(),
            "complaint_type": complaint_type,
            "priority": resolved_priority,
            "is_safety_hazard": is_safety,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
        ["role_bus_coordinator", "role_admin"],
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "Bus complaint registered successfully",
            "bus_complaint_id": bus_complaint_id,
        },
    )


@router.get("")
@router.get("/")
async def list_bus_complaints(
    status_filter: str | None = Query(default=None, alias="status"),
    complaint_type: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    bus_id: str | None = Query(default=None),
    route_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    safety_only: str | None = Query(default=None),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    role = current_user.get("role")
    user_id = current_user.get("user_id")

    if role in ("department_coordinator", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Department coordinators cannot access transportation complaints",
        )

    where = "WHERE 1=1"
    params: list[Any] = []

    if role == "student":
        where += " AND bc.user_id = %s"
        params.append(user_id)

    if status_filter:
        where += " AND bc.status = %s"
        params.append(status_filter)
    if complaint_type:
        where += " AND bc.complaint_type = %s"
        params.append(complaint_type)
    if priority:
        where += " AND bc.priority = %s"
        params.append(priority)
    if bus_id:
        where += " AND bc.bus_id = %s"
        params.append(bus_id)
    if route_id:
        where += " AND bc.route_id = %s"
        params.append(route_id)
    if safety_only in ("true", "1"):
        where += " AND bc.is_safety_hazard = 1"
    if search:
        where += " AND (bc.title LIKE %s OR bc.description LIKE %s)"
        like_term = f"%{search}%"
        params.extend([like_term, like_term])

    return await db.query_all(
        f"""
        SELECT bc.*,
               u.name AS student_name, u.email AS student_email,
               b.bus_number, b.driver_name, b.driver_phone,
               r.route_number, r.route_name,
               assignee.name AS assigned_to_name
        FROM bus_complaints bc
        JOIN users u ON bc.user_id = u.user_id
        LEFT JOIN buses b ON bc.bus_id = b.bus_id
        LEFT JOIN routes r ON bc.route_id = r.route_id
        LEFT JOIN users assignee ON bc.assigned_to = assignee.user_id
        {where}
        ORDER BY bc.is_safety_hazard DESC, bc.created_at DESC
        """,
        params,
    )


@router.get("/{bus_complaint_id}")
async def get_bus_complaint_detail(
    bus_complaint_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    role = current_user.get("role")
    user_id = current_user.get("user_id")

    if role in ("department_coordinator", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Department coordinators cannot access transportation complaints",
        )

    complaint = await db.query_one(
        """
        SELECT bc.*,
               u.name AS student_name, u.email AS student_email,
               b.bus_number, b.driver_name, b.driver_phone, b.capacity,
               r.route_number, r.route_name, r.start_point, r.end_point, r.stops_list,
               assignee.name AS assigned_to_name
        FROM bus_complaints bc
        JOIN users u ON bc.user_id = u.user_id
        LEFT JOIN buses b ON bc.bus_id = b.bus_id
        LEFT JOIN routes r ON bc.route_id = r.route_id
        LEFT JOIN users assignee ON bc.assigned_to = assignee.user_id
        WHERE bc.bus_complaint_id = %s
        """,
        (bus_complaint_id,),
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Bus complaint not found")

    if role == "student" and complaint["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this complaint")

    attachments = await db.query_all(
        "SELECT * FROM bus_complaint_attachments WHERE bus_complaint_id = %s",
        (bus_complaint_id,),
    )
    responses = await db.query_all(
        """
        SELECT r.*, u.name AS user_name, u.role AS user_role
        FROM bus_complaint_responses r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.bus_complaint_id = %s
        ORDER BY r.responded_at ASC
        """,
        (bus_complaint_id,),
    )
    audit_log = await db.query_all(
        """
        SELECT l.*, u.name AS actor_name, u.role AS actor_role
        FROM bus_complaint_audit_log l
        JOIN users u ON l.actor_id = u.user_id
        WHERE l.bus_complaint_id = %s
        ORDER BY l.created_at ASC
        """,
        (bus_complaint_id,),
    )

    return {
        **complaint,
        "attachments": attachments,
        "responses": responses,
        "auditLog": audit_log,
    }


@router.put("/{bus_complaint_id}/status")
async def update_bus_complaint_status(
    bus_complaint_id: int,
    body: BusStatusRequest,
    current_user: dict[str, Any] = Depends(bus_coordinator_only),
) -> dict[str, str]:
    if not body.status or body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(_VALID_STATUSES)}",
        )

    existing = await db.query_one(
        "SELECT * FROM bus_complaints WHERE bus_complaint_id = %s",
        (bus_complaint_id,),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Bus complaint not found")

    await db.execute(
        "UPDATE bus_complaints SET status = %s WHERE bus_complaint_id = %s",
        (body.status, bus_complaint_id),
    )
    await db.execute(
        """
        INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
        VALUES (%s, %s, 'STATUS_UPDATE', %s, %s, %s)
        """,
        (
            bus_complaint_id,
            current_user["user_id"],
            existing["status"],
            body.status,
            body.remarks or f"Status moved to {body.status}",
        ),
    )

    notif_msg = f"Your bus complaint #{bus_complaint_id} status updated to: {body.status}"
    await db.execute(
        "INSERT INTO notifications (user_id, complaint_id, message) VALUES (%s, NULL, %s)",
        (existing["user_id"], notif_msg),
    )
    await emit_to_rooms("notification", {"message": notif_msg}, [f"user_{existing['user_id']}"])

    return {"message": "Bus complaint status updated successfully"}


@router.put("/{bus_complaint_id}/assign")
async def assign_bus_complaint(
    bus_complaint_id: int,
    body: BusAssignRequest,
    current_user: dict[str, Any] = Depends(bus_coordinator_only),
) -> dict[str, str]:
    existing = await db.query_one(
        "SELECT * FROM bus_complaints WHERE bus_complaint_id = %s",
        (bus_complaint_id,),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Bus complaint not found")

    assignee_id = body.assigned_to or current_user["user_id"]
    await db.execute(
        """
        UPDATE bus_complaints
        SET assigned_to = %s, status = 'Assigned'
        WHERE bus_complaint_id = %s
        """,
        (assignee_id, bus_complaint_id),
    )
    await db.execute(
        """
        INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
        VALUES (%s, %s, 'ASSIGNED', %s, 'Assigned', %s)
        """,
        (
            bus_complaint_id,
            current_user["user_id"],
            existing["status"],
            body.remarks or "Assigned to coordinator",
        ),
    )
    return {"message": "Complaint assigned successfully"}


@router.post("/{bus_complaint_id}/escalate")
async def escalate_bus_complaint(
    bus_complaint_id: int,
    body: BusEscalateRequest,
    current_user: dict[str, Any] = Depends(bus_coordinator_only),
) -> dict[str, str]:
    reason = (body.escalation_reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A clear escalation reason is mandatory")

    existing = await db.query_one(
        "SELECT * FROM bus_complaints WHERE bus_complaint_id = %s",
        (bus_complaint_id,),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Bus complaint not found")

    await db.execute(
        """
        UPDATE bus_complaints
        SET status = 'Escalated', escalation_reason = %s, escalated_at = NOW()
        WHERE bus_complaint_id = %s
        """,
        (reason, bus_complaint_id),
    )
    await db.execute(
        """
        INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
        VALUES (%s, %s, 'ESCALATED', %s, 'Escalated', %s)
        """,
        (bus_complaint_id, current_user["user_id"], existing["status"], reason),
    )

    alert_msg = f'⚠️ ESCALATION: Bus Complaint #{bus_complaint_id} escalated to Admin: "{reason[:100]}"'
    await db.execute(
        """
        INSERT INTO notifications (user_id, complaint_id, message)
        SELECT user_id, NULL, %s FROM users WHERE role = 'admin'
        """,
        (alert_msg,),
    )
    await emit_to_rooms(
        "newEscalation",
        {
            "bus_complaint_id": bus_complaint_id,
            "reason": reason,
            "escalated_by": current_user["name"],
        },
        ["role_admin"],
    )
    return {"message": "Grievance escalated to University Administration successfully"}


@router.post("/{bus_complaint_id}/respond", status_code=status.HTTP_201_CREATED)
async def respond_to_bus_complaint(
    bus_complaint_id: int,
    body: BusRespondRequest,
    current_user: dict[str, Any] = Depends(bus_coordinator_only),
) -> JSONResponse:
    msg_text = (body.message or "").strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Response message cannot be empty")

    existing = await db.query_one(
        "SELECT * FROM bus_complaints WHERE bus_complaint_id = %s",
        (bus_complaint_id,),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Bus complaint not found")

    is_internal_flag = 1 if body.is_internal else 0
    await db.execute(
        """
        INSERT INTO bus_complaint_responses (bus_complaint_id, user_id, message, is_internal)
        VALUES (%s, %s, %s, %s)
        """,
        (bus_complaint_id, current_user["user_id"], msg_text, is_internal_flag),
    )
    await db.execute(
        """
        INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, notes)
        VALUES (%s, %s, 'REPLIED', %s)
        """,
        (
            bus_complaint_id,
            current_user["user_id"],
            "Added internal coordinator note" if body.is_internal else "Sent official response to student",
        ),
    )

    if not body.is_internal:
        notif_msg = f"Response received on your bus complaint #{bus_complaint_id}"
        await db.execute(
            "INSERT INTO notifications (user_id, complaint_id, message) VALUES (%s, NULL, %s)",
            (existing["user_id"], notif_msg),
        )
        await emit_to_rooms("notification", {"message": notif_msg}, [f"user_{existing['user_id']}"])

    return JSONResponse(status_code=status.HTTP_201_CREATED, content={"message": "Response posted successfully"})
