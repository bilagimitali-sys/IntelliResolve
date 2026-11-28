"""Department complaints router."""

from __future__ import annotations

import os
import random
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import config
import db
import mailer
from dependencies.auth import dept_coordinator_only, get_current_user, student_only
from socket_manager import emit_to_rooms
from utils.image_analyzer import analyze_image

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_ATTACHMENT_EXT = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx"}
_ALLOWED_VOICE_RE = re.compile(r"audio/(webm|mp4|ogg|mpeg|wav)", re.IGNORECASE)
_ALLOWED_VOICE_EXT = {".webm", ".mp4", ".ogg", ".mp3", ".mpeg", ".wav"}


class StatusUpdateRequest(BaseModel):
    status: str | None = None


class RespondRequest(BaseModel):
    message: str | None = None


def _ensure_upload_dirs() -> None:
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config.VOICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _unique_filename(original_name: str) -> str:
    ext = Path(original_name or "").suffix.lower()
    unique = f"{int(time.time() * 1000)}-{random.randint(0, 10**9)}"
    return f"{unique}{ext}"


async def _save_upload(upload: UploadFile, target_dir: Path, max_bytes: int = MAX_FILE_SIZE) -> tuple[str, Path]:
    data = await upload.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
    filename = _unique_filename(upload.filename or "")
    dest = target_dir / filename
    dest.write_bytes(data)
    return filename, dest


def _parse_bool(val: Any) -> int:
    if isinstance(val, bool):
        return 1 if val else 0
    if isinstance(val, (int, float)):
        return 1 if val == 1 else 0
    return 1 if str(val).strip().lower() in ("true", "1", "yes") else 0


def _parse_float(val: Any, default: float | None = None) -> float | None:
    if val is None or val == "":
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


@router.post("/check-image")
async def check_image(
    image: UploadFile | None = File(default=None),
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="No image provided")

    _ensure_upload_dirs()
    _, dest = await _save_upload(image, config.UPLOAD_DIR)
    try:
        return analyze_image(dest)
    finally:
        try:
            os.unlink(dest)
        except OSError:
            pass


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_complaint(
    background_tasks: BackgroundTasks,
    title: str = Form(""),
    description: str = Form(""),
    original_description: str = Form(""),
    ai_structured_summary: str = Form(""),
    category: str = Form(""),
    customCategory: str = Form(""),
    priority: str = Form("Low"),
    department_id: str = Form(""),
    is_safety_hazard: str = Form("false"),
    urgency_level: str = Form(""),
    sentiment_score: str = Form("0.0"),
    ai_confidence: str = Form(""),
    attachment: UploadFile | None = File(default=None),
    voiceNote: UploadFile | None = File(default=None),
    current_user: dict[str, Any] = Depends(student_only),
) -> JSONResponse:
    if not title.strip() or not description.strip() or not category.strip():
        raise HTTPException(status_code=400, detail="Title, description, and category are required")

    final_category = category.strip()
    if final_category == "Others":
        custom = customCategory.strip()
        if not custom:
            raise HTTPException(status_code=400, detail='Please specify category name for "Others"')
        if len(custom) > 100:
            raise HTTPException(status_code=400, detail="Custom category must be 100 characters or fewer")
        final_category = custom

    if not department_id.strip():
        raise HTTPException(status_code=400, detail="Please select a target university department")

    try:
        dept_id_int = int(department_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department selected")

    # Rate limit: max 3 complaints per 24 hours
    rate_row = await db.query_one(
        """
        SELECT COUNT(*) AS cnt FROM complaints
        WHERE user_id = %s AND created_at >= NOW() - INTERVAL 1 DAY
        """,
        (current_user["user_id"],),
    )
    if rate_row and int(rate_row["cnt"]) >= 3:
        raise HTTPException(
            status_code=429,
            detail="You have reached the maximum limit of 3 complaints for today. Please try again later.",
        )

    _ensure_upload_dirs()
    attachment_filename: str | None = None
    attachment_path: Path | None = None
    voice_note_path: str | None = None

    if attachment and attachment.filename:
        ext = Path(attachment.filename).suffix.lower()
        if ext not in _ALLOWED_ATTACHMENT_EXT:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed: JPG, PNG, GIF, PDF, DOC, DOCX",
            )
        attachment_filename, attachment_path = await _save_upload(attachment, config.UPLOAD_DIR)

    if voiceNote and voiceNote.filename:
        voice_ext = Path(voiceNote.filename).suffix.lower()
        mime_ok = bool(_ALLOWED_VOICE_RE.search(voiceNote.content_type or ""))
        if not mime_ok and voice_ext not in _ALLOWED_VOICE_EXT:
            raise HTTPException(
                status_code=400,
                detail="Invalid voice note format. Allowed: webm, mp4, ogg, wav",
            )
        voice_filename, _ = await _save_upload(voiceNote, config.VOICE_UPLOAD_DIR)
        voice_note_path = f"voice/{voice_filename}"

    is_ai_image = 0
    if attachment_path and re.search(r"\.(jpg|jpeg|png)$", attachment_path.name, re.IGNORECASE):
        try:
            ai_res = analyze_image(attachment_path)
            if ai_res.get("isAiGenerated"):
                is_ai_image = 1
        except Exception as exc:
            print(f"AI image check error: {exc}")

    dept = await db.query_one("SELECT * FROM departments WHERE id = %s", (dept_id_int,))
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department selected")

    is_safety = _parse_bool(is_safety_hazard)
    resolved_priority = "High" if is_safety else (priority.strip() or "Low")
    resolved_urgency = urgency_level.strip() or ("Critical" if is_safety else "Normal")
    orig_desc = (original_description or description).strip()

    complaint_id, _ = await db.execute(
        """
        INSERT INTO complaints
          (user_id, title, description, original_description, ai_structured_summary,
           category, priority, status, urgency_level, is_safety_hazard, sentiment_score, ai_confidence,
           attachment, is_ai_image, voice_note_path, department_id, department_code, routed_to_email)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            current_user["user_id"],
            title.strip(),
            description.strip(),
            orig_desc,
            ai_structured_summary.strip() or None,
            final_category,
            resolved_priority,
            resolved_urgency,
            is_safety,
            _parse_float(sentiment_score, 0.0),
            _parse_float(ai_confidence, None),
            attachment_filename,
            is_ai_image,
            voice_note_path,
            dept["id"],
            dept["code"],
            dept["hod_email"],
        ),
    )

    alert_prefix = "🚨 SAFETY ALERT: " if is_safety else ""
    await db.execute(
        """
        INSERT INTO notifications (user_id, complaint_id, message)
        SELECT user_id, %s, %s FROM users WHERE role = 'admin'
        """,
        (complaint_id, f'{alert_prefix}New complaint #{complaint_id} [{dept["code"]}]: "{title.strip()}"'),
    )
    await db.execute(
        """
        INSERT INTO notifications (user_id, complaint_id, message)
        SELECT user_id, %s, %s FROM users
        WHERE role IN ('department_coordinator','faculty','staff') AND department_id = %s
        """,
        (complaint_id, f'{alert_prefix}New department complaint #{complaint_id}: "{title.strip()}"', dept["id"]),
    )

    await emit_to_rooms(
        "newComplaint",
        {
            "complaint_id": complaint_id,
            "title": title.strip(),
            "category": final_category,
            "priority": resolved_priority,
            "department_code": dept["code"],
            "is_safety_hazard": is_safety,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
        ["role_admin", f"dept_{dept['id']}"],
    )

    background_tasks.add_task(
        mailer.send_complaint_confirmation,
        to_email=current_user["email"],
        to_name=current_user["name"],
        complaint_id=complaint_id,
        title=title.strip(),
    )
    background_tasks.add_task(
        mailer.send_hod_notification,
        hod_email=dept.get("hod_email"),
        hod_name=dept.get("hod_name"),
        dept_email=dept.get("dept_email"),
        dept_name=dept["name"],
        dept_code=dept["code"],
        complaint_id=complaint_id,
        student_name=current_user["name"],
        category=final_category,
        priority=resolved_priority,
        description=description.strip(),
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "Department grievance submitted successfully",
            "complaint_id": complaint_id,
        },
    )


@router.get("")
@router.get("/")
async def list_complaints(
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    search: str | None = Query(default=None),
    filter_dept_id: str | None = Query(default=None, alias="department_id"),
    safety_only: str | None = Query(default=None),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    department_id = current_user.get("department_id")

    if role == "bus_coordinator":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Bus coordinators cannot access department complaints",
        )

    where = "WHERE 1=1"
    params: list[Any] = []

    if role == "student":
        where += " AND c.user_id = %s"
        params.append(user_id)
    elif role in ("department_coordinator", "faculty", "staff"):
        where += " AND c.department_id = %s"
        params.append(department_id or 0)

    if filter_dept_id and role == "admin":
        where += " AND c.department_id = %s"
        params.append(filter_dept_id)
    if status_filter:
        where += " AND c.status = %s"
        params.append(status_filter)
    if category:
        where += " AND c.category = %s"
        params.append(category)
    if priority:
        where += " AND c.priority = %s"
        params.append(priority)
    if safety_only in ("true", "1"):
        where += " AND c.is_safety_hazard = 1"
    if search:
        where += " AND (c.title LIKE %s OR c.description LIKE %s)"
        like_term = f"%{search}%"
        params.extend([like_term, like_term])

    name_expr = "'Anonymous' AS student_name" if role == "faculty" else "u.name AS student_name"
    email_expr = "'hidden@privacy' AS student_email" if role == "faculty" else "u.email AS student_email"

    return await db.query_all(
        f"""
        SELECT c.*, {name_expr}, {email_expr},
               d.name AS department_name, d.code AS department_code, d.icon AS department_icon
        FROM complaints c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN departments d ON c.department_id = d.id
        {where}
        ORDER BY c.is_safety_hazard DESC, c.created_at DESC
        """,
        params,
    )


@router.get("/{complaint_id}")
async def get_complaint_detail(
    complaint_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    department_id = current_user.get("department_id")

    if role == "bus_coordinator":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Bus coordinators cannot access department complaints",
        )

    complaint = await db.query_one(
        """
        SELECT c.*,
               u.name AS student_name, u.email AS student_email,
               d.name AS department_name, d.icon AS department_icon,
               d.hod_name, d.hod_email AS dept_hod_email, d.dept_email
        FROM complaints c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.complaint_id = %s
        """,
        (complaint_id,),
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if role == "student" and complaint["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this grievance")
    if role in ("department_coordinator", "faculty", "staff") and complaint["department_id"] != department_id:
        raise HTTPException(status_code=403, detail="Access denied: Grievance does not belong to your department")

    responses = await db.query_all(
        """
        SELECT r.*, u.name AS admin_name, u.role AS responder_role
        FROM responses r
        JOIN users u ON r.admin_id = u.user_id
        WHERE r.complaint_id = %s
        ORDER BY r.responded_at ASC
        """,
        (complaint_id,),
    )
    return {**complaint, "responses": responses}


@router.put("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: int,
    body: StatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(dept_coordinator_only),
) -> dict[str, str]:
    valid_statuses = ("Pending", "In Progress", "Resolved")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status value")

    complaint = await db.query_one("SELECT * FROM complaints WHERE complaint_id = %s", (complaint_id,))
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.get("role") in ("department_coordinator", "faculty", "staff") and complaint["department_id"] != current_user.get("department_id"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only update complaints within your department",
        )

    await db.execute("UPDATE complaints SET status = %s WHERE complaint_id = %s", (body.status, complaint_id))

    student = await db.query_one(
        "SELECT user_id, email, name FROM users WHERE user_id = %s",
        (complaint["user_id"],),
    )
    if student:
        msg = f"Your grievance #{complaint['complaint_id']} status updated to: {body.status}"
        await db.execute(
            "INSERT INTO notifications (user_id, complaint_id, message) VALUES (%s, %s, %s)",
            (student["user_id"], complaint_id, msg),
        )
        await emit_to_rooms("notification", {"message": msg}, [f"user_{student['user_id']}"])
        background_tasks.add_task(
            mailer.send_status_update,
            to_email=student["email"],
            to_name=student["name"],
            complaint_id=complaint_id,
            title=complaint["title"],
            new_status=body.status,
        )

    return {"message": "Status updated successfully"}


@router.post("/{complaint_id}/respond", status_code=status.HTTP_201_CREATED)
async def respond_to_complaint(
    complaint_id: int,
    body: RespondRequest,
    current_user: dict[str, Any] = Depends(dept_coordinator_only),
) -> JSONResponse:
    msg_text = (body.message or "").strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Response message cannot be empty")

    complaint = await db.query_one("SELECT * FROM complaints WHERE complaint_id = %s", (complaint_id,))
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.get("role") in ("department_coordinator", "faculty", "staff") and complaint["department_id"] != current_user.get("department_id"):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Cannot respond to complaints outside your department",
        )

    await db.execute(
        "INSERT INTO responses (complaint_id, admin_id, message) VALUES (%s, %s, %s)",
        (complaint_id, current_user["user_id"], msg_text),
    )

    notif_msg = f'Official response posted for your grievance #{complaint["complaint_id"]}: "{complaint["title"]}"'
    await db.execute(
        "INSERT INTO notifications (user_id, complaint_id, message) VALUES (%s, %s, %s)",
        (complaint["user_id"], complaint_id, notif_msg),
    )
    await emit_to_rooms("notification", {"message": notif_msg}, [f"user_{complaint['user_id']}"])

    return JSONResponse(status_code=status.HTTP_201_CREATED, content={"message": "Response posted successfully"})
