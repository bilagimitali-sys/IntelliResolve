"""AI Intelligence & Chatbot router."""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from dependencies.auth import get_current_user
from utils.ai_service import (
    chat_with_grievance_ai,
    generate_draft_reply,
    intelligent_route,
    refine_complaint,
    summarize_grievance,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str | None = None
    conversationHistory: list[dict[str, Any]] | None = None


class TextRequest(BaseModel):
    text: str | None = None


class DuplicateCheckRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    module_type: str | None = None
    department_id: int | str | None = None
    route_id: int | str | None = None
    bus_id: int | str | None = None


class DraftReplyRequest(BaseModel):
    complaintTitle: str | None = None
    complaintDescription: str | None = None
    categoryOrType: str | None = None
    status: str | None = None


async def perform_duplicate_check(
    title: str | None = None,
    description: str | None = None,
    module_type: str | None = None,
    department_id: int | str | None = None,
    route_id: int | str | None = None,
    bus_id: int | str | None = None,
) -> dict[str, Any]:
    if not title and not description:
        return {"has_duplicate": False}

    query_text = f"{title or ''} {description or ''}".lower()
    query_tokens = {t for t in re.split(r"\W+", query_text) if len(t) > 3}
    if not query_tokens:
        return {"has_duplicate": False}

    try:
        candidates: list[dict[str, Any]] = []
        if module_type == "transportation":
            sql = """
                SELECT bus_complaint_id AS id, title, description, status, created_at, route_id, bus_id
                FROM bus_complaints
                WHERE status NOT IN ('Resolved')
                  AND created_at >= NOW() - INTERVAL 14 DAY
            """
            params: list[Any] = []
            if route_id:
                sql += " AND route_id = %s"
                params.append(route_id)
            if bus_id:
                sql += " AND bus_id = %s"
                params.append(bus_id)
            sql += " ORDER BY created_at DESC LIMIT 30"
            candidates = await db.query_all(sql, params)
        else:
            sql = """
                SELECT complaint_id AS id, title, description, status, created_at, department_id
                FROM complaints
                WHERE status NOT IN ('Resolved')
                  AND created_at >= NOW() - INTERVAL 14 DAY
            """
            params = []
            if department_id:
                sql += " AND department_id = %s"
                params.append(department_id)
            sql += " ORDER BY created_at DESC LIMIT 30"
            candidates = await db.query_all(sql, params)

        best_match: dict[str, Any] | None = None
        max_similarity = 0.0
        title_tokens = {t for t in re.split(r"\W+", (title or "").lower()) if len(t) > 3}

        for item in candidates:
            cand_text = f"{item.get('title', '')} {item.get('description', '')}".lower()
            cand_tokens = {t for t in re.split(r"\W+", cand_text) if len(t) > 3}
            if not cand_tokens:
                continue

            intersection = len(query_tokens & cand_tokens)
            union = len(query_tokens | cand_tokens)
            sim = intersection / union if union else 0.0

            cand_title_tokens = {t for t in re.split(r"\W+", (item.get("title") or "").lower()) if len(t) > 3}
            title_overlap = len(title_tokens & cand_title_tokens)
            title_bonus = (title_overlap / len(title_tokens)) * 0.2 if title_tokens else 0.0
            final_sim = min(1.0, sim + title_bonus)

            if final_sim > max_similarity:
                max_similarity = final_sim
                best_match = {**item, "similarity_score": round(final_sim * 100)}

        if max_similarity >= 0.38 and best_match:
            module_name = "bus complaint" if module_type == "transportation" else "department grievance"
            return {
                "has_duplicate": True,
                "similarity_percentage": best_match["similarity_score"],
                "matched_complaint": {
                    "id": best_match["id"],
                    "title": best_match["title"],
                    "status": best_match["status"],
                    "created_at": best_match["created_at"],
                    "module_type": module_type or "department",
                },
                "message": (
                    f'Similar open {module_name} found (#{best_match["id"]}: "{best_match["title"]}"). '
                    "You can review it or still proceed if this is an independent issue."
                ),
            }

        return {"has_duplicate": False}
    except Exception as exc:
        print(f"Duplicate query error: {exc}")
        return {"has_duplicate": False}


@router.post("/chat")
async def ai_chat(
    body: ChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    msg = (body.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    chat_response = await chat_with_grievance_ai(
        message=msg,
        conversation_history=body.conversationHistory or [],
        student_profile=current_user,
    )

    duplicate_check: dict[str, Any] = {"has_duplicate": False}
    extracted = chat_response.get("extracted_complaint")
    if extracted:
        duplicate_check = await perform_duplicate_check(
            title=extracted.get("title"),
            description=extracted.get("description") or extracted.get("what_happened"),
            module_type=extracted.get("target_module"),
            department_id=extracted.get("department_id"),
            route_id=extracted.get("route_id"),
            bus_id=extracted.get("bus_id"),
        )

    return {**chat_response, "duplicate_check": duplicate_check}


@router.post("/intelligent-route")
async def ai_intelligent_route(
    body: TextRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for intelligent routing")
    return await intelligent_route(text)


@router.post("/refine-complaint")
async def ai_refine_complaint(
    body: TextRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Please enter your complaint text to refine")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text exceeds maximum length of 5000 characters")
    return await refine_complaint(text)


@router.post("/classify")
async def ai_classify(
    body: TextRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for classification")
    return await intelligent_route(text)


@router.post("/check-duplicates")
async def ai_check_duplicates(
    body: DuplicateCheckRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return await perform_duplicate_check(
        title=body.title,
        description=body.description,
        module_type=body.module_type,
        department_id=body.department_id,
        route_id=body.route_id,
        bus_id=body.bus_id,
    )


@router.post("/draft-reply")
async def ai_draft_reply(
    body: DraftReplyRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    draft = await generate_draft_reply(
        complaint_title=body.complaintTitle or "Grievance",
        complaint_description=body.complaintDescription or "",
        category_or_type=body.categoryOrType or "General",
        status=body.status or "Under Review",
    )
    return {"draft": draft}


@router.post("/summarize")
async def ai_summarize(
    body: TextRequest,
    _: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    summary = await summarize_grievance(body.text)
    return {"summary": summary}
