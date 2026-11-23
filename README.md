# 🏛️ KLE Technological University — Centralized Grievance Management Platform (v4)
### Web Technologies Final Project | Group 11
**Belagavi Campus — Academic & Campus Transportation Grievance Redressal System**

---

## 🌟 Quick Start Guide for VS Code

### 1. Database Setup
Ensure MySQL is running (e.g. XAMPP MySQL). In VS Code Terminal:
```bash
cd "complaint-system-v3-fixed/complaint-system-v3/backend"
node migrate-v4.js
```
*This runs the non-destructive migration, creates all bus and department tables, and seeds the test accounts.*

### 2. Start Backend API Server
```bash
cd "complaint-system-v3-fixed/complaint-system-v3/backend"
npm install
node server.js
```
Backend starts on **http://localhost:5000**

### 3. Start Frontend UI
In a **new terminal tab**:
```bash
cd "complaint-system-v3-fixed/complaint-system-v3/frontend"
npm install
npm start
```
Frontend opens on **http://localhost:3000**

---

## 🔐 Verified Login Credentials

> **Standard password for all accounts:** `Password@1234`

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Administrator** | `admin@kletech.ac.in` | `Password@1234` | Full campus administration, fleet, escalations, analytics |
| **Student** | `ravi@kletech.ac.in` | `Password@1234` | Submit department and bus complaints, AI assistant, tracking |
| **Dept Coordinator (CSE)** | `cse.coord@kletech.ac.in` | `Password@1234` | Computer Science department grievances, AI draft replies |
| **Bus Coordinator** | `bus.coord@kletech.ac.in` | `Password@1234` | Campus bus complaints, fleet directory, escalations |

*(For full architecture and documentation, see `complaint-system-v3-fixed/complaint-system-v3/README.md`).*
