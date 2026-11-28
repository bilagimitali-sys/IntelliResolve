# 🏛️ KLE Technological University — Centralized Grievance Management Platform (v4)
### IntelliResolve | Group 11
**Belagavi Campus — Python FastAPI + React Academic & Campus Transportation Grievance Redressal System**

---

## 🌟 Executive Overview
The **KLE Tech Grievance Management Platform (IntelliResolve)** is a full-stack, AI-assisted grievance redressal portal powered by a **Python + FastAPI** backend (`Uvicorn` + `python-socketio` + `PyMySQL`) and a **React** frontend. It provides separate, role-isolated workflows for **Department & Academic Complaints** and **Campus Bus & Transportation Complaints**, complete with an interactive AI assistant (**KLE Saarthi**), real-time Socket.IO notifications, department isolation, audit logging, escalation workflows, and institutional analytics.

---

## 🔐 Seed Login Credentials (Verified)

> **All accounts have been seeded with the unified password:** `Password@1234`

| Role | Name | Email | Password | Scope & Responsibilities |
|---|---|---|---|---|
| **System Administrator** | System Admin | `admin@kletech.ac.in` | `Password@1234` | Full access across all departments, transportation fleet, coordinator provisioning, escalations, analytics. |
| **Student** | Ravi Kumar | `ravi@kletech.ac.in` | `Password@1234` | Submit & track personal department grievances, report bus issues, use AI assistant, voice notes, photo evidence. |
| **Department Coordinator** | Prof. Anand Patil | `cse.coord@kletech.ac.in` | `Password@1234` | Scoped strictly to Computer Science & Engineering grievances. Triage, AI draft replies, status updates. |
| **Bus Coordinator** | Mr. Ramesh Kulkarni | `bus.coord@kletech.ac.in` | `Password@1234` | Scoped to campus transit fleet & routes. Manage bus tickets (`Received` → `Resolved`), assign staff, escalate to admin. |

---

## 🚀 Step-by-Step Setup in VS Code

### Step 1: Database Setup & Migration
1. Ensure your local MySQL server (or XAMPP MySQL) is running.
2. Install Python dependencies and run the non-destructive migration script:
   ```powershell
   cd backend
   pip install -r requirements.txt
   python migrate_v4.py
   ```
   *This automatically provisions all transportation tables (`buses`, `routes`, `bus_complaints`, `bus_complaint_attachments`, `bus_complaint_responses`, `bus_complaint_audit_log`), adds AI intelligence columns, and seeds verified test accounts.*

*(For a clean fresh install on an empty database, you can also import `backend/schema.sql`.)*

---

### Step 2: Start the FastAPI Backend Server
In the `backend` terminal:
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```
- **Backend API URL**: `http://localhost:5000`
- **Swagger / OpenAPI Docs**: `http://localhost:5000/docs`
- **Uploads Directory**: `http://localhost:5000/uploads`
- **Socket.IO Service**: Mounted on port `5000` (`ASGIApp`)

---

### Step 3: Start the Frontend React App
Open a **new second terminal** and navigate to `frontend`:
```powershell
cd frontend
npm install
npm start
```
- **Web App URL**: `http://localhost:3000`

*(Or run both simultaneously from the project root with `npm start` or `.\start-project.bat`.)*

---

## 📁 Project Architecture & Folder Map

```
complaint-system-v3/
├── backend/                         ← 100% Python + FastAPI Backend
│   ├── dependencies/
│   │   └── auth.py                  ← JWT verification & allow-list role guards
│   ├── routers/
│   │   ├── auth.py                  ← Login, register, profile, coordinator creation & user management
│   │   ├── complaints.py            ← Scoped department grievance submit, list, detail, status, reply
│   │   ├── bus_complaints.py        ← Dedicated bus grievance CRUD, image uploads, assignment, escalation
│   │   ├── ai.py                    ← Chatbot (/chat), /status, intelligent routing, duplicate check, draft replies
│   │   ├── notifications.py         ← In-app notifications & read markers
│   │   ├── analytics.py             ← Campus-wide & route hotspot analytics
│   │   └── departments.py           ← 20 KLE Tech departments directory
│   ├── utils/
│   │   ├── ai_service.py            ← Dual-Engine AI (Live Cloud LLMs + Offline Smart Assistant)
│   │   └── image_analyzer.py        ← Pillow EXIF/metadata inspection for AI image markers
│   ├── tests/
│   │   └── test_api.py              ← FastAPI TestClient pytest suite
│   ├── uploads/                     ← Stored image attachments, voice notes, and transit photos
│   ├── config.py                    ← Environment settings loader (.env)
│   ├── db.py                        ← PyMySQL thread-safe connection pool & async query helpers
│   ├── mailer.py                    ← University branded SMTP email templates
│   ├── main.py                      ← FastAPI + Socket.IO ASGI entrypoint
│   ├── migrate_v4.py                ← Non-destructive Python MySQL migration script
│   ├── rollback_v4.py               ← Migration rollback script
│   ├── requirements.txt             ← Python package dependencies
│   ├── schema.sql                   ← Full database schema & seed data
│   ├── test_ai_features.py          ← 45-check AI intelligence verification suite
│   ├── test_db.py                   ← MySQL connectivity check
│   └── .env.example                 ← Environment template
│
└── frontend/                        ← React 18 UI
    ├── public/
    │   ├── kle-logo.png             ← KLE Tech Crest
    │   └── kle-campus.jpg           ← Belagavi Campus photo
    └── src/
        ├── context/
        │   ├── AuthContext.js       ← JWT session, token management, logout
        │   ├── SocketContext.js     ← Socket.IO client, role/department channels, real-time toast
        │   └── ThemeContext.js      ← Dark/light theme state
        ├── components/
        │   ├── AiChatWidget.js      ← Floating "KLE Saarthi" AI chatbot with recommendations & routing cards
        │   ├── AiComplaintAssistant.js ← Side-by-side structuring & interactive intake
        │   ├── StatusTimeline.js    ← Visual progress timeline
        │   ├── DepartmentSelector.js← 20 KLE Tech department card picker
        │   ├── VoiceRecorder.js     ← MediaRecorder voice note recording
        │   ├── Sidebar.js           ← Role-filtered sidebar & mobile drawer
        │   └── Layout.js            ← Header with breadcrumbs, notifications pill, footer
        ├── pages/
        │   ├── Login.js, Register.js, Dashboard.js
        │   ├── NewComplaint.js, MyComplaints.js, ComplaintDetail.js
        │   ├── BusComplaintDetail.js, BusCoordinatorDashboard.js, BusFleetView.js
        │   ├── FacultyDashboard.js, AdminDashboard.js, AdminComplaints.js, AdminCreateStaff.js
        │   └── Analytics.js, Notifications.js
        ├── App.js                   ← React Router v6 with role-guarded routes
        └── index.css                ← Academic Crimson & Slate Navy design system
```

---

## 🤖 AI Features & Architectural Guarantees

1. **KLE Saarthi Conversational AI Chatbot**:
   - Solves student questions directly, summarizes their live filed tickets from MySQL, gives actionable recommendations, and drafts a structured grievance only when an issue is being reported.
2. **AI Grievance Refiner & Zero Hallucination Constraint**:
   - Converts informal English or Hinglish into *Title, What Happened, When & Where, Impact, Requested Action*. Missing facts are explicitly marked `[Not provided by student]`.
3. **Emergency & Safety Hazard Prioritization**:
   - Flags harassment, physical danger, reckless driving, brake failures, fire, or medical emergencies as `Critical` priority (`is_safety_hazard = 1`).
4. **Intelligent Routing & Duplicate Detection**:
   - Routes automatically to one of 20 University Departments or Campus Transportation (Routes `R-01`–`R-04`, Buses `#01`–`#04`) and checks recent open tickets for duplicates.
5. **Coordinator AI Draft Reply Assistant**:
   - Generates professional university-grade draft responses customized to ticket details.
6. **Multi-Provider Live AI Reliability**:
   - Supports `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY` in `backend/.env`, includes built-in keyless cloud LLM endpoints (OVHcloud AI Endpoints + Pollinations AI), and falls back to the offline intent-aware campus assistant if no network is available.

---

## 🚌 Campus Transportation Module

- **Dedicated Tables**: `buses`, `routes`, `bus_complaints`, `bus_complaint_attachments`, `bus_complaint_responses`, `bus_complaint_audit_log`.
- **Pre-Seeded Fleet**: Bus `#01` (`KA-22-F-1024`) through Bus `#04` (`KA-22-F-1027`).
- **Pre-Seeded Routes**: `R-01` (CBT), `R-02` (RPD Cross / Tilakwadi), `R-03` (Railway Station), `R-04` (Vadgaon / Shahapur).
- **5-Stage Workflow**: `Received` ➔ `Under Review` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` (plus `Escalated` to Admin).

---

## 🧪 Running Tests
```powershell
cd "complaint-system-v3-fixed/complaint-system-v3/backend"
python test_ai_features.py
python -m pytest tests/test_api.py -v
```
