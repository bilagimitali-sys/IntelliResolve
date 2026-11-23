# 🎓 Complaint Management System
### Complete Full-Stack Web Application | Group 11 | Web Technologies

---

## 📁 Project Structure

```
complaint-system/
├── backend/                  ← Node.js + Express API
│   ├── routes/
│   │   ├── auth.js           ← Register / Login
│   │   ├── complaints.js     ← Submit, List, Detail, Respond
│   │   ├── notifications.js  ← Get & Mark read
│   │   └── analytics.js      ← Admin charts data
│   ├── middleware/
│   │   └── authMiddleware.js ← JWT protect & adminOnly
│   ├── db.js                 ← MySQL connection pool
│   ├── server.js             ← Express + Socket.io server
│   ├── schema.sql            ← Database tables + seed data
│   ├── .env                  ← Environment variables
│   └── package.json
│
└── frontend/                 ← React.js UI
    └── src/
        ├── context/
        │   └── AuthContext.js      ← Global user state
        ├── components/
        │   ├── Sidebar.js          ← Navigation sidebar
        │   └── Layout.js           ← Page wrapper
        ├── pages/
        │   ├── Login.js            ← Sign in page
        │   ├── Register.js         ← Sign up page
        │   ├── Dashboard.js        ← Student home
        │   ├── NewComplaint.js     ← Submit complaint form
        │   ├── MyComplaints.js     ← Student complaint list
        │   ├── ComplaintDetail.js  ← View + respond
        │   ├── AdminComplaints.js  ← Admin complaint table
        │   ├── Analytics.js        ← Charts dashboard
        │   └── Notifications.js    ← Notifications list
        ├── App.js                  ← Routes
        ├── index.js                ← Entry point
        └── index.css               ← Global styles
```

---

## ⚙️ SETUP INSTRUCTIONS

### STEP 1 — Install MySQL & Create Database

```bash
# Open MySQL terminal
mysql -u root -p

# Run the schema file
source /path/to/complaint-system/backend/schema.sql
```

This creates `complaint_db` with 4 tables + 2 seed accounts.

---

### STEP 2 — Setup Backend

```bash
cd complaint-system/backend

# Install dependencies
npm install

# Edit .env file with your MySQL password
nano .env
# Set DB_PASSWORD=yourpassword

# Start the server
node server.js
# OR with auto-reload:
npx nodemon server.js
```

Server starts at: **http://localhost:5000**

---

### STEP 3 — Setup Frontend

```bash
cd complaint-system/frontend

# Install dependencies
npm install

# Start React app
npm start
```

App opens at: **http://localhost:3000**

---

## 🔐 Login Credentials

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@college.edu      | Admin@1234  |
| Student | ravi@student.edu       | password    |

> **Note:** The seed passwords in schema.sql are pre-hashed. Use these exact credentials.

---

## ✨ Features by Sprint

### Sprint 1 — Foundation
- ✅ MySQL database schema (4 tables)
- ✅ User registration with bcrypt password hashing
- ✅ User login with JWT token
- ✅ Protected routes middleware

### Sprint 2 — Complaint Module
- ✅ Submit complaint form (title, description, category, priority)
- ✅ File attachment upload (JPG, PNG, PDF up to 5MB)
- ✅ View complaint list with filters
- ✅ Real-time status tracking

### Sprint 3 — Admin Dashboard
- ✅ Admin view all complaints
- ✅ Filter by status, category, priority
- ✅ Search by keyword
- ✅ Post responses to complaints
- ✅ Update complaint status (Pending → In Progress → Resolved)

### Sprint 4 — Notifications
- ✅ In-app notifications on status change
- ✅ Mark as read / Mark all as read
- ✅ Socket.io server ready for real-time push
- ✅ Notification badge count in sidebar

### Sprint 5 — Analytics & Deployment
- ✅ Bar chart: complaints by category
- ✅ Doughnut chart: status distribution
- ✅ Doughnut chart: priority breakdown
- ✅ Line chart: monthly trend (6 months)
- ✅ KPI cards: total, pending, resolved, resolution rate, avg days

---

## 🌐 API Endpoints

| Method | Endpoint                        | Auth     | Description                |
|--------|---------------------------------|----------|----------------------------|
| POST   | /api/auth/register              | Public   | Create account             |
| POST   | /api/auth/login                 | Public   | Login, get JWT             |
| GET    | /api/auth/me                    | User     | Get own profile            |
| POST   | /api/complaints                 | User     | Submit complaint           |
| GET    | /api/complaints                 | User     | List complaints            |
| GET    | /api/complaints/:id             | User     | Complaint detail           |
| PUT    | /api/complaints/:id/status      | Admin    | Update status              |
| POST   | /api/complaints/:id/respond     | Admin    | Post response              |
| GET    | /api/notifications              | User     | Get notifications          |
| PUT    | /api/notifications/:id/read     | User     | Mark one read              |
| PUT    | /api/notifications/read-all/all | User     | Mark all read              |
| GET    | /api/analytics                  | Admin    | Get analytics data         |

---

## 📧 Email Notifications (Optional)

To enable email notifications, edit `.env`:

```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password  # Gmail App Password, not regular password
```

Then in `routes/complaints.js`, uncomment the Nodemailer section.

---

## 🛠 Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Frontend     | React.js 18, React Router v6 |
| Charts       | Chart.js + react-chartjs-2 |
| HTTP Client  | Axios                   |
| Backend      | Node.js + Express.js    |
| Database     | MySQL 8 + mysql2        |
| Auth         | JWT + bcrypt            |
| File Upload  | Multer                  |
| Real-time    | Socket.io               |
| Email        | Nodemailer (optional)   |

---

*Project by Group 11 | Web Technologies | Academic Year 2024-25*
