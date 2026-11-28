# 🏛️ KLE Technological University — Centralized Grievance Management Platform (v4)
### IntelliResolve | Group 11
**Belagavi Campus — Python FastAPI + React Academic & Campus Transportation Grievance Redressal System**

AI-powered grievance management system with smart complaint classification, priority detection, duplicate detection, live AI chatbot (`KLE Saarthi`), and automated department/bus routing for KLE Technological University.

---

## 🌟 Quick Start Guide

### 1. Database Setup
Ensure **MySQL** is running (e.g., via **XAMPP Control Panel**), then run the Python migration script:
```powershell
cd "complaint-system-v3-fixed/complaint-system-v3/backend"
pip install -r requirements.txt
python migrate_v4.py
```
*This runs the non-destructive migration, creates all department and bus tables, and seeds the test accounts.*

### 2. Run Backend + Frontend Together (Recommended)
From the **project root**:
```powershell
npm start
```
*(Or double-click `start-project.bat`.)*
- **Frontend UI:** http://localhost:3000
- **FastAPI Backend:** http://localhost:5000
- **FastAPI Swagger Docs:** http://localhost:5000/docs

### 3. Or Run Separately in Two Terminals
**Terminal 1 — Python FastAPI Backend (Port 5000):**
```powershell
cd "complaint-system-v3-fixed/complaint-system-v3/backend"
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 2 — React Frontend (Port 3000):**
```powershell
cd "complaint-system-v3-fixed/complaint-system-v3/frontend"
npm install
npm start
```

---

## 🔐 Verified Login Credentials

> **Standard password for all accounts:** `Password@1234`

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Administrator** | `admin@kletech.ac.in` | `Password@1234` | Full campus administration, fleet, escalations, analytics |
| **Student** | `ravi@kletech.ac.in` | `Password@1234` | Submit department and bus complaints, AI assistant, tracking |
| **Dept Coordinator (CSE)** | `cse.coord@kletech.ac.in` | `Password@1234` | Computer Science department grievances, AI draft replies |
| **Bus Coordinator** | `bus.coord@kletech.ac.in` | `Password@1234` | Campus bus complaints, fleet directory, escalations |

*(For full architecture and documentation, see `complaint-system-v3-fixed/complaint-system-v3/README.md`.)*
