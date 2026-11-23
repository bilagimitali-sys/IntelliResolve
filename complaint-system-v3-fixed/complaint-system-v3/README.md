# 🏛️ KLE Technological University — Centralized Grievance Management Platform (v4)
### Web Technologies Final Project | Group 11
**Belagavi Campus — Academic & Campus Transportation Grievance Redressal System**

---

## 🌟 Executive Overview
The **KLE Tech Grievance Management Platform** is an enterprise-grade, full-stack, AI-assisted grievance redressal portal. It provides separate, role-isolated workflows for **Department & Academic Complaints** and **Campus Bus & Transportation Complaints**, complete with an interactive AI complaint drafting chatbot, real-time WebSocket notifications, department isolation, audit logging, escalation workflows, and institutional analytics.

---

## 🔐 Seed Login Credentials (Verified)

> **All accounts have been seeded with the unified password:** `Password@1234`

| Role | Name | Email | Password | Scope & Responsibilities |
|---|---|---|---|---|
| **System Administrator** | System Admin | `admin@kletech.ac.in` | `Password@1234` | Full access across all departments, transportation fleet, coordinator provisioning, escalations, analytics. |
| **Student** | Ravi Kumar | `ravi@kletech.ac.in` | `Password@1234` | Submit & track personal department grievances, report bus issues, use AI assistant, voice notes, photo evidence. |
| **Department Coordinator** | Prof. Anand Patil | `cse.coord@kletech.ac.in` | `Password@1234` | Scoped strictly to Computer Science & Engineering grievances. Triage, AI draft replies, status updates. |
| **Bus Coordinator** | Mr. Ramesh Kulkarni | `bus.coord@kletech.ac.in` | `Password@1234` | Scoped to campus transit fleet & routes. Manage bus tickets (`Received` → `Resolved`), assign staff, escalate to admin. |

*(Legacy passwords `Admin@1234` on admin and `Test@1234` on student are also maintained for backward compatibility).*

---

## 🚀 Step-by-Step Setup in VS Code

### Step 1: Open Project in VS Code
Open VS Code in the project root:
```bash
cd "c:\Users\bilag\Downloads\complaint-system-v3-fixed (2) (1)\complaint-system-v3-fixed\complaint-system-v3"
```

---

### Step 2: Database Setup & Migration
1. Ensure your local MySQL server (or XAMPP MySQL) is running.
2. In VS Code Terminal, navigate to `backend`:
   ```bash
   cd backend
   ```
3. Run the non-destructive migration script:
   ```bash
   node migrate-v4.js
   ```
   *This automatically provisions all transportation tables (`buses`, `routes`, `bus_complaints`, `bus_complaint_attachments`, `bus_complaint_responses`, `bus_complaint_audit_log`), adds AI intelligence columns, and seeds verified test accounts.*

*(For a clean fresh install on an empty database, you can also import `backend/schema.sql`).*

---

### Step 3: Start the Backend Server
In the `backend` terminal:
```bash
# If running for the first time
npm install

# Start the server
node server.js
```
- **Backend API URL**: `http://localhost:5000`
- **Uploads Directory**: `http://localhost:5000/uploads`
- **Socket.io Service**: Ready on port 5000

---

### Step 4: Start the Frontend React App
Open a **new second terminal** in VS Code and navigate to `frontend`:
```bash
cd frontend

# If running for the first time
npm install

# Start React development server
npm start
```
- **Web App URL**: `http://localhost:3000`
- The portal will open automatically in your browser!

---

## 📁 Project Architecture & Folder Map

```
complaint-system-v3/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js        ← Allow-list role guards (protect, studentOnly, busCoordinatorOnly, adminOnly)
│   ├── routes/
│   │   ├── auth.js                  ← Login, register, profile, coordinator creation & user management
│   │   ├── complaints.js            ← Scoped department grievance submit, list, detail, status, reply
│   │   ├── busComplaints.js         ← Dedicated bus grievance CRUD, image uploads, assignment, escalation
│   │   ├── ai.js                    ← AI refinement, auto-classification, duplicate detection, draft replies
│   │   ├── notifications.js         ← In-app notifications & read markers
│   │   ├── analytics.js             ← Campus-wide & route hotspot analytics
│   │   └── departments.js           ← 20 KLE Tech departments directory
│   ├── utils/
│   │   ├── aiService.js             ← Dual-Engine AI (Google Gemini + Heuristic fallback parser)
│   │   └── imageAnalyzer.js         ← EXIF inspection for AI image markers
│   ├── uploads/                     ← Stored image attachments, voice notes, and transit photos
│   ├── db.js                        ← MySQL2 connection pool
│   ├── mailer.js                    ← University branded Nodemailer templates
│   ├── migrate-v4.js                ← Non-destructive migration script
│   ├── rollback-v4.js               ← Migration rollback script
│   ├── schema.sql                   ← Full database schema & seed data
│   ├── server.js                    ← Express + Socket.IO server setup
│   └── .env.example                 ← Environment template
│
└── frontend/
    ├── public/
    │   ├── kle-logo.png             ← KLE Tech Crest (Preserved identity asset)
    │   └── kle-campus.jpg           ← Belagavi Campus building photo (Preserved identity asset)
    └── src/
        ├── context/
        │   ├── AuthContext.js       ← JWT session, token management, logout
        │   ├── SocketContext.js     ← Dynamic socket connection, role/department channels, real-time toast
        │   └── ThemeContext.js      ← Dark/light theme state
        ├── components/
        │   ├── AiComplaintAssistant.js ← Chatbot assistant with side-by-side diff preview
        │   ├── StatusTimeline.js    ← 5-stage visual progress timeline
        │   ├── DepartmentSelector.js← 20 KLE Tech department card picker
        │   ├── VoiceRecorder.js     ← MediaRecorder voice note recording
        │   ├── Sidebar.js           ← Role-filtered sidebar & mobile drawer
        │   └── Layout.js            ← Header with breadcrumbs, notifications pill, footer
        ├── pages/
        │   ├── Login.js             ← University campus branded login
        │   ├── Register.js          ← Student self-registration
        │   ├── Dashboard.js         ← Student home with quick launch cards
        │   ├── NewComplaint.js      ← Tabbed Department & Bus grievance form
        │   ├── MyComplaints.js      ← Tabbed personal grievance tracking
        │   ├── ComplaintDetail.js   ← Department complaint detail with AI draft replies
        │   ├── BusComplaintDetail.js← Bus detail with assignment, escalation & audit log
        │   ├── BusCoordinatorDashboard.js ← Bus Coordinator transportation hub
        │   ├── BusFleetView.js      ← Campus bus fleet & scheduled routes directory
        │   ├── FacultyDashboard.js  ← Department Coordinator dashboard
        │   ├── AdminDashboard.js    ← Master administrative command center
        │   ├── AdminComplaints.js   ← Central grievances registry
        │   ├── AdminCreateStaff.js  ← Coordinator provisioning panel
        │   ├── Analytics.js         ← Chart.js executive analytics
        │   └── Notifications.js     ← Notification center
        ├── App.js                   ← React Router v6 with allow-list Private guard
        └── index.css                ← Academic Crimson & Slate Navy executive design system
```

---

## 🤖 AI Features & Architectural Guarantees

1. **AI Grievance Refiner & Structuring Chatbot**:
   - Students can write informal text in casual English or Hinglish.
   - Converts input into: *Title, What Happened, When & Where, Impact, Requested Action*.
   - **Zero Hallucination Constraint**: Never invents dates, times, bus numbers, or names. Missing details are explicitly marked `[Not provided by student]`.
   - Side-by-side comparison ensures the student reviews, edits, and explicitly approves before submitting.

2. **Emergency & Safety Hazard Prioritization**:
   - Automated detection of harassment, physical danger, reckless driving, brake failures, fire, or medical emergencies.
   - Sets `is_safety_hazard = 1` and prioritizes ticket at the very top of coordinator and admin queues with a pulsing red badge.

3. **Intelligent Routing**:
   - Automatically determines whether a complaint pertains to a Campus Department or Transportation and routes it accordingly.

4. **Duplicate Detection Suggestion**:
   - Evaluates similarity against recent open tickets to alert the student before submission. Tickets are never auto-merged; humans decide.

5. **Coordinator AI Draft Reply Assistant**:
   - Generates polite, professional draft replies customized to the complaint details. Coordinator can edit before dispatching.

6. **Dual Engine Reliability**:
   - Uses Google Gemini API if `GEMINI_API_KEY` is provided in `.env`.
   - If offline or without an API key, automatically falls back to the built-in heuristic NLP parser with zero downtime.

---

## 🚌 Campus Transportation Module

- **Dedicated Tables**: `buses`, `routes`, `bus_complaints`, `bus_complaint_attachments`, `bus_complaint_responses`, `bus_complaint_audit_log`.
- **Pre-Seeded Fleet**:
  - `KA-22-F-1024 (Bus #01)` — Driver: Mallikarjun Patil (+91 94481 23401)
  - `KA-22-F-1025 (Bus #02)` — Driver: Suresh Jadhav (+91 94481 23402)
  - `KA-22-F-1026 (Bus #03)` — Driver: Basavaraj Hiremath (+91 94481 23403)
  - `KA-22-F-1027 (Bus #04)` — Driver: Gopal Hegde (+91 94481 23404)
- **Pre-Seeded Routes**:
  - `Route R-01`: Belagavi Central Bus Terminal (CBT) to KLE Tech Campus
  - `Route R-02`: RPD Cross / Tilakwadi to KLE Tech Campus
  - `Route R-03`: Belagavi Railway Station to KLE Tech Campus
  - `Route R-04`: Vadgaon / Shahapur to KLE Tech Campus
- **5-Stage Workflow**:
  `Received` ➔ `Under Review` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` (plus `Escalated` to Admin).

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Portal / Action | Student | Dept Coordinator | Bus Coordinator | Admin |
|---|:---:|:---:|:---:|:---:|
| **Submit Dept Complaint** | ✅ | ❌ | ❌ | ❌ |
| **Submit Bus Complaint** | ✅ | ❌ | ❌ | ❌ |
| **View Own Complaints** | ✅ | ❌ | ❌ | ❌ |
| **View Assigned Dept Complaints** | ❌ | ✅ (Own Dept Only) | ❌ (403 Blocked) | ✅ (All Depts) |
| **View Bus Complaints** | ❌ | ❌ (403 Blocked) | ✅ (All Routes) | ✅ (All Routes) |
| **Assign / Escalate Bus Ticket** | ❌ | ❌ | ✅ | ✅ |
| **Admin Command Center** | ❌ (Blocked) | ❌ (Blocked) | ❌ (Blocked) | ✅ |
| **Provision Coordinators** | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Verification Matrix & Test Results

| Workflow Test | Status | Result / Notes |
|---|:---:|---|
| Student Register & Login | **PASS** | Validated with bcrypt password hashing and 7d JWT tokens. |
| AI-Assisted Complaint Structuring | **PASS** | Informal Hinglish/English text parsed into 4 structured sections without hallucination. |
| Side-by-Side Review & Edit | **PASS** | Student reviews original vs AI version and can edit before approving. |
| Student Bus Complaint with Photo | **PASS** | Validates route/bus selection, uploads image up to 5MB, logs in `bus_complaints`. |
| Bus Coordinator 5-Stage Triage | **PASS** | Status updates through `Received` → `Resolved`, student notified via socket. |
| Bus Grievance Escalation to Admin | **PASS** | Mandatory reason required, status moved to `Escalated`, alerted on Admin dashboard. |
| Department Scoping Isolation | **PASS** | CSE coordinator blocked from viewing Mechanical or Bus grievances. |
| Bus Coordinator Scoping Isolation | **PASS** | Bus coordinator blocked from viewing department grievances or `/admin` routes. |
| Safety Alert Prioritization | **PASS** | Complaints with safety keywords flagged `is_safety_hazard=1` and pinned at top. |
| Duplicate Detection Banner | **PASS** | Warns student of open duplicate submissions within 14-day window. |
| Mobile Responsiveness | **PASS** | Mobile off-canvas drawer with hamburger button works on screens < 900px. |
| Non-Destructive Migration & Rollback | **PASS** | `migrate-v4.js` runs cleanly without dropping data; `rollback-v4.js` verified. |

---

*Project by Group 11 | Web Technologies | KLE Technological University, Belagavi Campus*
