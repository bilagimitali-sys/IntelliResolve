"""Comprehensive pytest API & integration test suite for the FastAPI backend."""

from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import Any

import bcrypt
import pytest
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import db  # noqa: E402
import main  # noqa: E402


class FakeDatabase:
    """Deterministic in-memory mock matching db.query_all / query_one / execute."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        pw_hash = bcrypt.hashpw(b"Password@1234", bcrypt.gensalt(rounds=4)).decode("utf-8")
        self.departments = [
            {"id": 1, "name": "Computer Science & Engineering", "code": "CSE", "hod_name": "Dr. HoD CSE", "hod_email": "hod.cse@kletech.ac.in", "dept_email": "cse@kletech.ac.in", "icon": "💻"},
            {"id": 14, "name": "Hostel / Accommodation", "code": "HSTEL", "hod_name": "Warden", "hod_email": "warden@kletech.ac.in", "dept_email": "hostel@kletech.ac.in", "icon": "🏠"},
        ]
        self.users = [
            {"user_id": 1, "name": "System Administrator", "email": "admin@kletech.ac.in", "password": pw_hash, "role": "admin", "department": None, "department_id": None, "is_active": 1, "created_at": "2026-11-01T10:00:00"},
            {"user_id": 2, "name": "Ravi Kumar", "email": "ravi@kletech.ac.in", "password": pw_hash, "role": "student", "department": "Computer Science & Engineering", "department_id": 1, "is_active": 1, "created_at": "2026-11-01T10:00:00"},
            {"user_id": 3, "name": "Prof. Anand Patil", "email": "cse.coord@kletech.ac.in", "password": pw_hash, "role": "department_coordinator", "department": "Computer Science & Engineering", "department_id": 1, "is_active": 1, "created_at": "2026-11-01T10:00:00"},
            {"user_id": 4, "name": "Mr. Ramesh Kulkarni", "email": "bus.coord@kletech.ac.in", "password": pw_hash, "role": "bus_coordinator", "department": None, "department_id": None, "is_active": 1, "created_at": "2026-11-01T10:00:00"},
            {"user_id": 5, "name": "Dr. Faculty", "email": "faculty@kletech.ac.in", "password": pw_hash, "role": "faculty", "department": "Computer Science & Engineering", "department_id": 1, "is_active": 1, "created_at": "2026-11-01T10:00:00"},
        ]
        self.buses = [
            {"bus_id": 1, "bus_number": "KA-22-F-1024 (Bus #01)", "capacity": 52, "driver_name": "Mallikarjun Patil", "driver_phone": "+91 94481 23401", "is_active": 1},
        ]
        self.routes = [
            {"route_id": 1, "route_number": "R-01", "route_name": "Belagavi CBT to Campus", "start_point": "CBT Belagavi", "end_point": "KLE Tech Campus", "stops_list": "CBT, Bogarves", "is_active": 1},
        ]
        self.complaints: list[dict[str, Any]] = []
        self.responses: list[dict[str, Any]] = []
        self.notifications: list[dict[str, Any]] = []
        self.bus_complaints: list[dict[str, Any]] = []
        self.bus_attachments: list[dict[str, Any]] = []
        self.bus_responses: list[dict[str, Any]] = []
        self.bus_audit_log: list[dict[str, Any]] = []

    def _dept_by_id(self, dept_id: int | None) -> dict[str, Any] | None:
        return next((d for d in self.departments if d["id"] == dept_id), None)

    def _user_by_id(self, uid: int | None) -> dict[str, Any] | None:
        return next((u for u in self.users if u["user_id"] == uid), None)

    async def query_all(self, sql: str, params: Any = None) -> list[dict[str, Any]]:
        s = " ".join(sql.split())
        p = tuple(params or ())

        if "FROM departments ORDER BY name ASC" in s:
            return sorted(self.departments, key=lambda d: d["name"])
        if "FROM users WHERE email = %s" in s:
            return [u for u in self.users if u["email"] == p[0]]
        if "FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE 1=1" in s:
            rows = []
            for u in self.users:
                d = self._dept_by_id(u.get("department_id")) or {}
                rows.append({**u, "department_name": d.get("name"), "department_code": d.get("code")})
            return rows
        if "FROM buses WHERE is_active = TRUE" in s:
            return self.buses
        if "FROM routes WHERE is_active = TRUE" in s:
            return self.routes
        if "FROM complaints c JOIN users u ON c.user_id = u.user_id" in s and "WHERE c.department_id = %s" in s and "LEFT JOIN departments" not in s:
            dept_id = int(p[0])
            return [
                {**c, "student_name": (self._user_by_id(c["user_id"]) or {}).get("name"), "student_email": (self._user_by_id(c["user_id"]) or {}).get("email")}
                for c in self.complaints
                if c["department_id"] == dept_id
            ]
        if "FROM complaints c JOIN users u" in s:
            res = []
            for c in self.complaints:
                if "AND c.user_id = %s" in s and c["user_id"] != p[0]:
                    continue
                if "AND c.department_id = %s" in s and c["department_id"] != p[0]:
                    continue
                u = self._user_by_id(c["user_id"]) or {}
                d = self._dept_by_id(c["department_id"]) or {}
                res.append(
                    {
                        **c,
                        "student_name": "Anonymous" if "'Anonymous' AS student_name" in s else u.get("name"),
                        "student_email": "hidden@privacy" if "'hidden@privacy' AS student_email" in s else u.get("email"),
                        "department_name": d.get("name"),
                        "department_code": d.get("code"),
                        "department_icon": d.get("icon"),
                    }
                )
            return res
        if "FROM responses r JOIN users u" in s:
            cid = int(p[0])
            return [
                {**r, "admin_name": (self._user_by_id(r["admin_id"]) or {}).get("name"), "responder_role": (self._user_by_id(r["admin_id"]) or {}).get("role")}
                for r in self.responses
                if r["complaint_id"] == cid
            ]
        if "FROM bus_complaints bc JOIN users u" in s:
            res = []
            for bc in self.bus_complaints:
                if "AND bc.user_id = %s" in s and bc["user_id"] != p[0]:
                    continue
                u = self._user_by_id(bc["user_id"]) or {}
                b = next((x for x in self.buses if x["bus_id"] == bc.get("bus_id")), {})
                r = next((x for x in self.routes if x["route_id"] == bc.get("route_id")), {})
                res.append(
                    {
                        **bc,
                        "student_name": u.get("name"),
                        "student_email": u.get("email"),
                        "bus_number": b.get("bus_number"),
                        "driver_name": b.get("driver_name"),
                        "driver_phone": b.get("driver_phone"),
                        "route_number": r.get("route_number"),
                        "route_name": r.get("route_name"),
                        "assigned_to_name": (self._user_by_id(bc.get("assigned_to")) or {}).get("name"),
                    }
                )
            return res
        if "FROM bus_complaint_attachments" in s:
            bcid = int(p[0])
            return [a for a in self.bus_attachments if a["bus_complaint_id"] == bcid]
        if "FROM bus_complaint_responses" in s:
            bcid = int(p[0])
            return [
                {**r, "user_name": (self._user_by_id(r["user_id"]) or {}).get("name"), "user_role": (self._user_by_id(r["user_id"]) or {}).get("role")}
                for r in self.bus_responses
                if r["bus_complaint_id"] == bcid
            ]
        if "FROM bus_complaint_audit_log" in s:
            bcid = int(p[0])
            return [
                {**l, "actor_name": (self._user_by_id(l["actor_id"]) or {}).get("name"), "actor_role": (self._user_by_id(l["actor_id"]) or {}).get("role")}
                for l in self.bus_audit_log
                if l["bus_complaint_id"] == bcid
            ]
        if "FROM notifications n" in s:
            uid = int(p[0])
            return [n for n in self.notifications if n["user_id"] == uid]
        if "GROUP BY category" in s or "GROUP BY priority" in s or "GROUP BY complaint_type" in s:
            return []
        if "FROM departments d LEFT JOIN complaints c" in s:
            return [{"id": d["id"], "name": d["name"], "code": d["code"], "icon": d["icon"], "total_complaints": 0, "resolved_complaints": 0} for d in self.departments]
        if "FROM routes r LEFT JOIN bus_complaints bc" in s:
            return [{"route_id": r["route_id"], "route_number": r["route_number"], "route_name": r["route_name"], "complaint_count": 0, "safety_count": 0} for r in self.routes]
        if "DATE_FORMAT(created_at" in s:
            return []
        if "FROM complaints WHERE status NOT IN" in s:
            return [
                {"id": c["complaint_id"], "title": c["title"], "description": c["description"], "status": c["status"], "created_at": c["created_at"], "department_id": c["department_id"]}
                for c in self.complaints
                if c["status"] != "Resolved"
            ]
        if "FROM bus_complaints WHERE status NOT IN" in s:
            return [
                {"id": b["bus_complaint_id"], "title": b["title"], "description": b["description"], "status": b["status"], "created_at": b["created_at"], "route_id": b["route_id"], "bus_id": b["bus_id"]}
                for b in self.bus_complaints
                if b["status"] != "Resolved"
            ]
        return []

    async def query_one(self, sql: str, params: Any = None) -> dict[str, Any] | None:
        s = " ".join(sql.split())
        p = tuple(params or ())

        if "FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = %s" in s:
            u = next((x for x in self.users if x["email"] == p[0]), None)
            if not u:
                return None
            d = self._dept_by_id(u.get("department_id")) or {}
            return {**u, "dept_name": d.get("name"), "dept_code": d.get("code")}
        if "WHERE u.user_id = %s" in s:
            u = self._user_by_id(int(p[0]))
            if not u:
                return None
            d = self._dept_by_id(u.get("department_id")) or {}
            return {**u, "department_name": d.get("name"), "department_code": d.get("code"), "department_icon": d.get("icon")}
        if "SELECT user_id, email, name FROM users WHERE user_id = %s" in s:
            return self._user_by_id(int(p[0]))
        if "FROM departments WHERE id = %s" in s:
            return self._dept_by_id(int(p[0]))
        if "FROM departments WHERE name = %s OR code = %s" in s:
            return next((d for d in self.departments if d["name"] == p[0] or d["code"] == p[1]), None)
        if "SELECT COUNT(*) AS cnt FROM complaints" in s:
            uid = int(p[0])
            return {"cnt": sum(1 for c in self.complaints if c["user_id"] == uid)}
        if "FROM complaints c JOIN users u" in s and "WHERE c.complaint_id = %s" in s:
            cid = int(p[0])
            c = next((x for x in self.complaints if x["complaint_id"] == cid), None)
            if not c:
                return None
            u = self._user_by_id(c["user_id"]) or {}
            d = self._dept_by_id(c["department_id"]) or {}
            return {**c, "student_name": u.get("name"), "student_email": u.get("email"), "department_name": d.get("name"), "department_icon": d.get("icon"), "hod_name": d.get("hod_name"), "dept_hod_email": d.get("hod_email"), "dept_email": d.get("dept_email")}
        if "SELECT * FROM complaints WHERE complaint_id = %s" in s:
            cid = int(p[0])
            return next((x for x in self.complaints if x["complaint_id"] == cid), None)
        if "FROM bus_complaints bc JOIN users u" in s and "WHERE bc.bus_complaint_id = %s" in s:
            bcid = int(p[0])
            bc = next((x for x in self.bus_complaints if x["bus_complaint_id"] == bcid), None)
            if not bc:
                return None
            u = self._user_by_id(bc["user_id"]) or {}
            b = next((x for x in self.buses if x["bus_id"] == bc.get("bus_id")), {})
            r = next((x for x in self.routes if x["route_id"] == bc.get("route_id")), {})
            return {**bc, "student_name": u.get("name"), "student_email": u.get("email"), "bus_number": b.get("bus_number"), "driver_name": b.get("driver_name"), "driver_phone": b.get("driver_phone"), "capacity": b.get("capacity"), "route_number": r.get("route_number"), "route_name": r.get("route_name"), "start_point": r.get("start_point"), "end_point": r.get("end_point"), "stops_list": r.get("stops_list"), "assigned_to_name": (self._user_by_id(bc.get("assigned_to")) or {}).get("name")}
        if "SELECT * FROM bus_complaints WHERE bus_complaint_id = %s" in s:
            bcid = int(p[0])
            return next((x for x in self.bus_complaints if x["bus_complaint_id"] == bcid), None)
        if "SUM(status = 'Pending')" in s:
            return {"total": len(self.complaints), "pending": sum(1 for c in self.complaints if c["status"] == "Pending"), "in_progress": 0, "resolved": sum(1 for c in self.complaints if c["status"] == "Resolved"), "safety_hazards": sum(1 for c in self.complaints if c["is_safety_hazard"] == 1)}
        if "SUM(status = 'Received')" in s:
            return {"total": len(self.bus_complaints), "received": sum(1 for b in self.bus_complaints if b["status"] == "Received"), "under_review": 0, "assigned": 0, "in_progress": 0, "resolved": 0, "escalated": sum(1 for b in self.bus_complaints if b["status"] == "Escalated"), "safety_hazards": sum(1 for b in self.bus_complaints if b["is_safety_hazard"] == 1)}
        if "AVG(DATEDIFF" in s:
            return {"avg_days": 1.5}
        return None

    async def execute(self, sql: str, params: Any = None) -> tuple[int, int]:
        s = " ".join(sql.split())
        p = tuple(params or ())

        if s.startswith("INSERT INTO users"):
            uid = max((u["user_id"] for u in self.users), default=0) + 1
            self.users.append({"user_id": uid, "name": p[0], "email": p[1], "password": p[2], "role": p[3], "department": p[4], "department_id": p[5], "is_active": 1, "created_at": "2026-11-28T10:00:00"})
            return uid, 1
        if s.startswith("UPDATE users SET is_active = %s WHERE user_id = %s"):
            for u in self.users:
                if u["user_id"] == int(p[1]):
                    u["is_active"] = 1 if p[0] else 0
            return 0, 1
        if s.startswith("INSERT INTO complaints"):
            cid = max((c["complaint_id"] for c in self.complaints), default=0) + 1
            self.complaints.append(
                {
                    "complaint_id": cid,
                    "user_id": p[0],
                    "title": p[1],
                    "description": p[2],
                    "original_description": p[3],
                    "ai_structured_summary": p[4],
                    "category": p[5],
                    "priority": p[6],
                    "status": "Pending",
                    "urgency_level": p[7],
                    "is_safety_hazard": p[8],
                    "sentiment_score": p[9],
                    "ai_confidence": p[10],
                    "attachment": p[11],
                    "is_ai_image": p[12],
                    "voice_note_path": p[13],
                    "department_id": p[14],
                    "department_code": p[15],
                    "routed_to_email": p[16],
                    "created_at": "2026-11-28T10:00:00",
                    "updated_at": "2026-11-28T10:00:00",
                }
            )
            return cid, 1
        if s.startswith("UPDATE complaints SET status = %s WHERE complaint_id = %s"):
            for c in self.complaints:
                if c["complaint_id"] == int(p[1]):
                    c["status"] = p[0]
            return 0, 1
        if s.startswith("INSERT INTO responses"):
            rid = len(self.responses) + 1
            self.responses.append({"response_id": rid, "complaint_id": int(p[0]), "admin_id": int(p[1]), "message": p[2], "responded_at": "2026-11-28T10:05:00"})
            return rid, 1
        if s.startswith("INSERT INTO bus_complaints"):
            bcid = max((b["bus_complaint_id"] for b in self.bus_complaints), default=0) + 1
            self.bus_complaints.append(
                {
                    "bus_complaint_id": bcid,
                    "user_id": p[0],
                    "bus_id": p[1],
                    "route_id": p[2],
                    "complaint_type": p[3],
                    "title": p[4],
                    "description": p[5],
                    "original_description": p[6],
                    "incident_datetime": str(p[7]),
                    "priority": p[8],
                    "status": "Received",
                    "is_safety_hazard": p[9],
                    "assigned_to": None,
                    "escalation_reason": None,
                    "created_at": "2026-11-28T10:00:00",
                }
            )
            return bcid, 1
        if s.startswith("INSERT INTO bus_complaint_attachments"):
            aid = len(self.bus_attachments) + 1
            self.bus_attachments.append({"attachment_id": aid, "bus_complaint_id": int(p[0]), "filename": p[1], "original_name": p[2], "mime_type": p[3], "file_size": p[4]})
            return aid, 1
        if s.startswith("INSERT INTO bus_complaint_audit_log"):
            lid = len(self.bus_audit_log) + 1
            if len(p) == 5:
                self.bus_audit_log.append({"log_id": lid, "bus_complaint_id": int(p[0]), "actor_id": int(p[1]), "action": s.split("'")[1], "old_status": p[2], "new_status": p[3], "notes": p[4], "created_at": "2026-11-28T10:00:00"})
            elif len(p) == 4:
                self.bus_audit_log.append({"log_id": lid, "bus_complaint_id": int(p[0]), "actor_id": int(p[1]), "action": s.split("'")[1], "old_status": p[2], "new_status": s.split("'")[3], "notes": p[3], "created_at": "2026-11-28T10:00:00"})
            elif len(p) == 3:
                self.bus_audit_log.append({"log_id": lid, "bus_complaint_id": int(p[0]), "actor_id": int(p[1]), "action": "REPLIED", "notes": p[2], "created_at": "2026-11-28T10:00:00"})
            else:
                self.bus_audit_log.append({"log_id": lid, "bus_complaint_id": int(p[0]), "actor_id": int(p[1]), "action": "CREATED", "new_status": "Received", "notes": "Grievance submitted by student", "created_at": "2026-11-28T10:00:00"})
            return lid, 1
        if s.startswith("UPDATE bus_complaints SET status = %s WHERE bus_complaint_id = %s"):
            for b in self.bus_complaints:
                if b["bus_complaint_id"] == int(p[1]):
                    b["status"] = p[0]
            return 0, 1
        if s.startswith("UPDATE bus_complaints SET assigned_to"):
            for b in self.bus_complaints:
                if b["bus_complaint_id"] == int(p[1]):
                    b["assigned_to"] = p[0]
                    b["status"] = "Assigned"
            return 0, 1
        if s.startswith("UPDATE bus_complaints SET status = 'Escalated'"):
            for b in self.bus_complaints:
                if b["bus_complaint_id"] == int(p[1]):
                    b["status"] = "Escalated"
                    b["escalation_reason"] = p[0]
            return 0, 1
        if s.startswith("INSERT INTO bus_complaint_responses"):
            rid = len(self.bus_responses) + 1
            self.bus_responses.append({"response_id": rid, "bus_complaint_id": int(p[0]), "user_id": int(p[1]), "message": p[2], "is_internal": p[3], "responded_at": "2026-11-28T10:10:00"})
            return rid, 1
        if s.startswith("INSERT INTO notifications") and "SELECT" in s:
            role_filter = ("admin",) if "role = 'admin'" in s else (("bus_coordinator", "admin") if "bus_coordinator" in s else ("department_coordinator", "faculty", "staff"))
            for u in self.users:
                if u["role"] in role_filter:
                    nid = len(self.notifications) + 1
                    cid = p[0] if len(p) >= 2 and isinstance(p[0], int) else None
                    msg = p[1] if len(p) >= 2 else p[0]
                    self.notifications.append({"notif_id": nid, "user_id": u["user_id"], "complaint_id": cid, "message": msg, "is_read": 0, "sent_at": "2026-11-28T10:00:00"})
            return 0, 1
        if s.startswith("INSERT INTO notifications"):
            nid = len(self.notifications) + 1
            cid = p[1] if len(p) == 3 else None
            msg = p[2] if len(p) == 3 else p[1]
            self.notifications.append({"notif_id": nid, "user_id": int(p[0]), "complaint_id": cid, "message": msg, "is_read": 0, "sent_at": "2026-11-28T10:00:00"})
            return nid, 1
        if s.startswith("UPDATE notifications SET is_read = TRUE WHERE user_id = %s"):
            for n in self.notifications:
                if n["user_id"] == int(p[0]):
                    n["is_read"] = 1
            return 0, 1
        if s.startswith("UPDATE notifications SET is_read = TRUE WHERE notif_id = %s"):
            for n in self.notifications:
                if n["notif_id"] == int(p[0]) and n["user_id"] == int(p[1]):
                    n["is_read"] = 1
            return 0, 1
        return 0, 1


fake_db = FakeDatabase()


@pytest.fixture(autouse=True)
def patch_db(monkeypatch: pytest.MonkeyPatch) -> FakeDatabase:
    fake_db.reset()
    monkeypatch.setattr(db, "query_all", fake_db.query_all)
    monkeypatch.setattr(db, "query_one", fake_db.query_one)
    monkeypatch.setattr(db, "execute", fake_db.execute)
    monkeypatch.setattr(db, "test_connection", lambda: True)
    return fake_db


client = TestClient(main.fastapi_app)


def _login(email: str) -> dict[str, Any]:
    res = client.post("/api/auth/login", json={"email": email, "password": "Password@1234"})
    assert res.status_code == 200, res.text
    return res.json()


def test_health_and_404_error_shape() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "HEALTHY"

    r404 = client.get("/api/does-not-exist")
    assert r404.status_code == 404
    assert "error" in r404.json()


def test_auth_flow_and_admin_endpoints() -> None:
    # Unauthenticated returns {"error": ...}
    me_unauth = client.get("/api/auth/me")
    assert me_unauth.status_code == 401
    assert me_unauth.json()["error"] == "No token provided"

    # Blocks self-registration of admin
    bad_reg = client.post(
        "/api/auth/register",
        json={"name": "Fake Admin", "email": "fake@kletech.ac.in", "password": "Password@1234", "role": "admin"},
    )
    assert bad_reg.status_code == 403
    assert "error" in bad_reg.json()

    # Registers student
    good_reg = client.post(
        "/api/auth/register",
        json={"name": "New Student", "email": "new.stu@kletech.ac.in", "password": "Password@1234", "department_id": 1},
    )
    assert good_reg.status_code == 201

    student = _login("ravi@kletech.ac.in")
    assert student["user"]["role"] == "student"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student['token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "ravi@kletech.ac.in"

    # Admin creates coordinator via /api/admin/coordinators
    admin = _login("admin@kletech.ac.in")
    headers = {"Authorization": f"Bearer {admin['token']}"}
    create_coord = client.post(
        "/api/admin/coordinators",
        headers=headers,
        json={"name": "Hostel Coord", "email": "h.coord@kletech.ac.in", "password": "Password@1234", "role": "department_coordinator", "department_id": 14},
    )
    assert create_coord.status_code == 201
    new_uid = create_coord.json()["user_id"]

    users_res = client.get("/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    assert any(u["email"] == "h.coord@kletech.ac.in" for u in users_res.json())

    toggle = client.put(f"/api/admin/users/{new_uid}/status", headers=headers, json={"is_active": False})
    assert toggle.status_code == 200


def test_department_complaints_and_rbac() -> None:
    student_tok = _login("ravi@kletech.ac.in")["token"]
    dept_tok = _login("cse.coord@kletech.ac.in")["token"]
    bus_tok = _login("bus.coord@kletech.ac.in")["token"]
    faculty_tok = _login("faculty@kletech.ac.in")["token"]

    # Create PNG with Stable Diffusion metadata in memory to test image analyzer
    buf = io.BytesIO()
    img = Image.new("RGB", (64, 64), color="red")
    meta = PngImagePlugin.PngInfo()
    meta.add_text("parameters", "a lab room\nSteps: 20, Sampler: Euler a, CFG scale: 7")
    img.save(buf, format="PNG", pnginfo=meta)
    buf.seek(0)

    check_res = client.post(
        "/api/complaints/check-image",
        headers={"Authorization": f"Bearer {student_tok}"},
        files={"image": ("ai_test.png", buf.getvalue(), "image/png")},
    )
    assert check_res.status_code == 200
    assert check_res.json()["isAiGenerated"] is True

    # Submit department complaint
    create_res = client.post(
        "/api/complaints",
        headers={"Authorization": f"Bearer {student_tok}"},
        data={
            "title": "Projector broken in CSE Lab",
            "description": "The projector in CSE 302 is not turning on since morning.",
            "category": "Infrastructure",
            "priority": "High",
            "department_id": "1",
            "is_safety_hazard": "false",
        },
        files={"attachment": ("evidence.png", buf.getvalue(), "image/png")},
    )
    assert create_res.status_code == 201, create_res.text
    cid = create_res.json()["complaint_id"]

    # Bus coordinator cannot access department complaints
    bus_forbidden = client.get("/api/complaints", headers={"Authorization": f"Bearer {bus_tok}"})
    assert bus_forbidden.status_code == 403

    # Faculty sees anonymized student name
    fac_list = client.get("/api/complaints", headers={"Authorization": f"Bearer {faculty_tok}"})
    assert fac_list.status_code == 200
    assert fac_list.json()[0]["student_name"] == "Anonymous"

    # Dept coordinator updates status & responds
    st_res = client.put(
        f"/api/complaints/{cid}/status",
        headers={"Authorization": f"Bearer {dept_tok}"},
        json={"status": "In Progress"},
    )
    assert st_res.status_code == 200

    resp_res = client.post(
        f"/api/complaints/{cid}/respond",
        headers={"Authorization": f"Bearer {dept_tok}"},
        json={"message": "Technician assigned to check Room 302."},
    )
    assert resp_res.status_code == 201

    detail = client.get(f"/api/complaints/{cid}", headers={"Authorization": f"Bearer {student_tok}"})
    assert detail.status_code == 200
    assert detail.json()["status"] == "In Progress"
    assert len(detail.json()["responses"]) == 1

    # Duplicate check detects it
    dup = client.post(
        "/api/ai/check-duplicates",
        headers={"Authorization": f"Bearer {student_tok}"},
        json={
            "title": "Projector broken in CSE Lab",
            "description": "The projector in CSE 302 is not turning on since morning.",
            "module_type": "department",
            "department_id": 1,
        },
    )
    assert dup.status_code == 200
    assert dup.json()["has_duplicate"] is True


def test_bus_complaints_notifications_analytics_and_ai() -> None:
    student_tok = _login("ravi@kletech.ac.in")["token"]
    bus_tok = _login("bus.coord@kletech.ac.in")["token"]
    dept_tok = _login("cse.coord@kletech.ac.in")["token"]

    assert client.get("/api/bus-complaints/buses", headers={"Authorization": f"Bearer {student_tok}"}).status_code == 200
    assert client.get("/api/bus-complaints/routes", headers={"Authorization": f"Bearer {student_tok}"}).status_code == 200

    create_bus = client.post(
        "/api/bus-complaints",
        headers={"Authorization": f"Bearer {student_tok}"},
        data={
            "bus_id": "1",
            "route_id": "1",
            "complaint_type": "delay",
            "title": "Bus #01 delayed at CBT",
            "description": "Bus #01 arrived 35 minutes late at CBT Belagavi today.",
            "incident_datetime": "2026-11-28T08:15",
            "priority": "Medium",
            "is_safety_hazard": "false",
        },
    )
    assert create_bus.status_code == 201
    bcid = create_bus.json()["bus_complaint_id"]

    # Dept coordinator forbidden from bus complaints
    assert client.get("/api/bus-complaints", headers={"Authorization": f"Bearer {dept_tok}"}).status_code == 403

    # Bus coordinator updates, responds, escalates
    assert client.put(f"/api/bus-complaints/{bcid}/status", headers={"Authorization": f"Bearer {bus_tok}"}, json={"status": "Under Review"}).status_code == 200
    assert client.post(f"/api/bus-complaints/{bcid}/respond", headers={"Authorization": f"Bearer {bus_tok}"}, json={"message": "Checking GPS logs."}).status_code == 201
    assert client.post(f"/api/bus-complaints/{bcid}/escalate", headers={"Authorization": f"Bearer {bus_tok}"}, json={"escalation_reason": "Repeated schedule breach"}).status_code == 200

    detail = client.get(f"/api/bus-complaints/{bcid}", headers={"Authorization": f"Bearer {bus_tok}"})
    assert detail.status_code == 200
    assert detail.json()["status"] == "Escalated"
    assert len(detail.json()["auditLog"]) == 4

    # Notifications
    notifs = client.get("/api/notifications", headers={"Authorization": f"Bearer {student_tok}"})
    assert notifs.status_code == 200
    assert len(notifs.json()) >= 2
    assert client.put("/api/notifications/read-all/all", headers={"Authorization": f"Bearer {student_tok}"}).status_code == 200

    # Analytics
    analytics = client.get("/api/analytics", headers={"Authorization": f"Bearer {bus_tok}"})
    assert analytics.status_code == 200
    assert analytics.json()["transport"]["totals"]["total"] == 1

    # AI endpoints
    chat = client.post("/api/ai/chat", headers={"Authorization": f"Bearer {student_tok}"}, json={"message": "Bus #02 from CBT was 30 mins late"})
    assert chat.status_code == 200
    assert chat.json()["routing"]["target_module"] == "transportation"

    draft = client.post("/api/ai/draft-reply", headers={"Authorization": f"Bearer {bus_tok}"}, json={"complaintTitle": "Bus delayed"})
    assert draft.status_code == 200
    assert "draft" in draft.json()


def test_socketio_asgi_handshake() -> None:
    sio_client = TestClient(main.app)
    res = sio_client.get("/socket.io/?EIO=4&transport=polling")
    assert res.status_code == 200
    assert "sid" in res.text
