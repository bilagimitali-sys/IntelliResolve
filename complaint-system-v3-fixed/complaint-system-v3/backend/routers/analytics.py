"""Analytics router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

import db
from dependencies.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
@router.get("/")
async def get_analytics(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    role = current_user.get("role")
    department_id = current_user.get("department_id")

    dept_where = "WHERE 1=1"
    dept_params: list[Any] = []
    if role in ("department_coordinator", "faculty", "staff") and department_id:
        dept_where += " AND department_id = %s"
        dept_params.append(department_id)

    dept_totals = await db.query_one(
        f"""
        SELECT
          COUNT(*) AS total,
          SUM(status = 'Pending') AS pending,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Resolved') AS resolved,
          SUM(is_safety_hazard = 1) AS safety_hazards
        FROM complaints
        {dept_where}
        """,
        dept_params,
    ) or {"total": 0, "pending": 0, "in_progress": 0, "resolved": 0, "safety_hazards": 0}

    by_category = await db.query_all(
        f"""
        SELECT category, COUNT(*) AS count
        FROM complaints
        {dept_where}
        GROUP BY category
        ORDER BY count DESC
        """,
        dept_params,
    )

    by_priority = await db.query_all(
        f"""
        SELECT priority, COUNT(*) AS count
        FROM complaints
        {dept_where}
        GROUP BY priority
        """,
        dept_params,
    )

    avg_time = await db.query_one(
        f"""
        SELECT ROUND(AVG(DATEDIFF(updated_at, created_at)), 1) AS avg_days
        FROM complaints
        {dept_where} AND status = 'Resolved'
        """,
        dept_params,
    )

    by_department: list[dict[str, Any]] = []
    if role == "admin":
        by_department = await db.query_all(
            """
            SELECT d.id, d.name, d.code, d.icon,
                   COUNT(c.complaint_id) AS total_complaints,
                   SUM(c.status = 'Resolved') AS resolved_complaints
            FROM departments d
            LEFT JOIN complaints c ON d.id = c.department_id
            GROUP BY d.id, d.name, d.code, d.icon
            ORDER BY total_complaints DESC
            """
        )

    bus_totals = await db.query_one(
        """
        SELECT
          COUNT(*) AS total,
          SUM(status = 'Received') AS received,
          SUM(status = 'Under Review') AS under_review,
          SUM(status = 'Assigned') AS assigned,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Resolved') AS resolved,
          SUM(status = 'Escalated') AS escalated,
          SUM(is_safety_hazard = 1) AS safety_hazards
        FROM bus_complaints
        """
    ) or {
        "total": 0,
        "received": 0,
        "under_review": 0,
        "assigned": 0,
        "in_progress": 0,
        "resolved": 0,
        "escalated": 0,
        "safety_hazards": 0,
    }

    by_bus_type = await db.query_all(
        """
        SELECT complaint_type, COUNT(*) AS count
        FROM bus_complaints
        GROUP BY complaint_type
        ORDER BY count DESC
        """
    )

    route_hotspots = await db.query_all(
        """
        SELECT r.route_id, r.route_number, r.route_name,
               COUNT(bc.bus_complaint_id) AS complaint_count,
               SUM(bc.is_safety_hazard = 1) AS safety_count
        FROM routes r
        LEFT JOIN bus_complaints bc ON r.route_id = bc.route_id
        GROUP BY r.route_id, r.route_number, r.route_name
        ORDER BY complaint_count DESC
        """
    )

    dept_filter_clause = dept_where.replace("WHERE 1=1", "")
    monthly_params: list[Any] = ["%b %Y", *dept_params, "%b %Y"]
    monthly_dept = await db.query_all(
        f"""
        SELECT
          DATE_FORMAT(created_at, %s) AS month,
          COUNT(*) AS total,
          SUM(status = 'Resolved') AS resolved
        FROM complaints
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        {dept_filter_clause}
        GROUP BY DATE_FORMAT(created_at, %s), YEAR(created_at), MONTH(created_at)
        ORDER BY YEAR(created_at), MONTH(created_at)
        """,
        monthly_params,
    )

    dept_safety = int(dept_totals.get("safety_hazards") or 0)
    bus_safety = int(bus_totals.get("safety_hazards") or 0)

    return {
        "role": role,
        "department": {
            "totals": dept_totals,
            "byCategory": by_category,
            "byPriority": by_priority,
            "avgResolutionDays": float(avg_time["avg_days"]) if (avg_time and avg_time.get("avg_days") is not None) else 0,
            "byDepartment": by_department,
            "monthly": monthly_dept,
        },
        "transport": {
            "totals": bus_totals,
            "byType": by_bus_type,
            "routeHotspots": route_hotspots,
        },
        "overall_safety_alerts": dept_safety + bus_safety,
    }
