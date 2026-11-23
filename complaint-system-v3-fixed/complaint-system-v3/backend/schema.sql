-- ============================================================
-- KLE TECHNOLOGICAL UNIVERSITY — BELAGAVI CAMPUS
-- GRIEVANCE MANAGEMENT PLATFORM v4 — DATABASE SCHEMA
-- Compatible with MySQL 8.0+ and MariaDB 10.4+ (XAMPP compatible)
--
-- ⚠️ IMPORTANT NOTICE FOR EXISTING DATABASES:
-- If you already have existing data in complaint_db, DO NOT RUN this file!
-- Instead run: node migrate-v4.js (which uses non-destructive ALTER/CREATE).
-- ============================================================

CREATE DATABASE IF NOT EXISTS complaint_db;
USE complaint_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bus_complaint_audit_log;
DROP TABLE IF EXISTS bus_complaint_responses;
DROP TABLE IF EXISTS bus_complaint_attachments;
DROP TABLE IF EXISTS bus_complaints;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS buses;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── 1. DEPARTMENTS ───────────────────────────────────────────
CREATE TABLE departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  code        VARCHAR(20)   NOT NULL UNIQUE,
  hod_name    VARCHAR(100),
  hod_email   VARCHAR(150),
  dept_email  VARCHAR(150),
  icon        VARCHAR(10),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. USERS ─────────────────────────────────────────────────
CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password       VARCHAR(255)  NOT NULL,
  role           ENUM('student','faculty','staff','department_coordinator','bus_coordinator','admin') NOT NULL DEFAULT 'student',
  department     VARCHAR(100)  DEFAULT NULL,
  department_id  INT           DEFAULT NULL,
  is_active      BOOLEAN       DEFAULT TRUE,
  created_at     DATETIME      DEFAULT NOW(),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ── 3. DEPARTMENT COMPLAINTS ──────────────────────────────────
CREATE TABLE complaints (
  complaint_id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT          NOT NULL,
  title                  VARCHAR(200) NOT NULL,
  description            TEXT         NOT NULL,
  original_description   TEXT         NULL,
  ai_structured_summary  TEXT         NULL,
  category               VARCHAR(100) NOT NULL,
  priority               ENUM('Low','Medium','High','Critical') DEFAULT 'Low',
  status                 ENUM('Pending','In Progress','Resolved') DEFAULT 'Pending',
  urgency_level          ENUM('Normal','Urgent','Critical') DEFAULT 'Normal',
  is_safety_hazard       BOOLEAN      DEFAULT FALSE,
  sentiment_score        DECIMAL(3,2) DEFAULT 0.00,
  ai_confidence          DECIMAL(3,2) DEFAULT NULL,
  attachment             VARCHAR(300) DEFAULT NULL,
  is_ai_image            TINYINT(1)   DEFAULT 0,
  voice_note_path        VARCHAR(255) DEFAULT NULL,
  department_id          INT          DEFAULT NULL,
  department_code        VARCHAR(20)  DEFAULT NULL,
  routed_to_email        VARCHAR(150) DEFAULT NULL,
  assigned_coordinator_id INT         DEFAULT NULL,
  created_at             DATETIME     DEFAULT NOW(),
  updated_at             DATETIME     DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_coordinator_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_dept_user_created (user_id, created_at),
  INDEX idx_dept_status (status),
  INDEX idx_dept_safety (is_safety_hazard)
);

-- ── 4. DEPARTMENT RESPONSES ───────────────────────────────────
CREATE TABLE responses (
  response_id  INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT  NOT NULL,
  admin_id     INT  NOT NULL,
  message      TEXT NOT NULL,
  responded_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id)     REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ── 5. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE notifications (
  notif_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT  NOT NULL,
  complaint_id INT  NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN  DEFAULT FALSE,
  sent_at      DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id)      REFERENCES users(user_id)           ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
);

-- ── 6. BUSES (TRANSPORTATION FLEET) ──────────────────────────
CREATE TABLE buses (
  bus_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_number VARCHAR(50) NOT NULL UNIQUE,
  capacity INT DEFAULT 50,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT NOW()
);

-- ── 7. ROUTES ────────────────────────────────────────────────
CREATE TABLE routes (
  route_id INT AUTO_INCREMENT PRIMARY KEY,
  route_number VARCHAR(50) NOT NULL UNIQUE,
  route_name VARCHAR(150) NOT NULL,
  start_point VARCHAR(100) NOT NULL,
  end_point VARCHAR(100) NOT NULL,
  stops_list TEXT,
  morning_schedule VARCHAR(100),
  evening_schedule VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT NOW()
);

-- ── 8. BUS COMPLAINTS ────────────────────────────────────────
CREATE TABLE bus_complaints (
  bus_complaint_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT NULL,
  route_id INT NULL,
  complaint_type ENUM(
    'delay',
    'driver_behaviour',
    'cleanliness',
    'maintenance',
    'route_issue',
    'overcrowding',
    'safety'
  ) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  original_description TEXT,
  incident_datetime DATETIME NOT NULL,
  priority ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  status ENUM('Received','Under Review','Assigned','In Progress','Resolved','Escalated') DEFAULT 'Received',
  assigned_to INT NULL,
  escalation_reason TEXT NULL,
  escalated_at DATETIME NULL,
  is_safety_hazard BOOLEAN DEFAULT FALSE,
  sentiment_score DECIMAL(3,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE SET NULL,
  FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_bus_comp_user (user_id),
  INDEX idx_bus_comp_status (status),
  INDEX idx_bus_comp_safety (is_safety_hazard)
);

-- ── 9. BUS COMPLAINT ATTACHMENTS ─────────────────────────────
CREATE TABLE bus_complaint_attachments (
  attachment_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_complaint_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (bus_complaint_id) REFERENCES bus_complaints(bus_complaint_id) ON DELETE CASCADE
);

-- ── 10. BUS COMPLAINT RESPONSES ──────────────────────────────
CREATE TABLE bus_complaint_responses (
  response_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_complaint_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  responded_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (bus_complaint_id) REFERENCES bus_complaints(bus_complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── 11. BUS COMPLAINT AUDIT LOG ──────────────────────────────
CREATE TABLE bus_complaint_audit_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_complaint_id INT NOT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (bus_complaint_id) REFERENCES bus_complaints(bus_complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── SEED DEPARTMENTS ─────────────────────────────────────────
INSERT INTO departments (name, code, hod_name, hod_email, dept_email, icon) VALUES
('Computer Science & Engineering',     'CSE',   'Dr. HoD CSE',         'hod.cse@kletech.ac.in',      'cse@kletech.ac.in',          '💻'),
('Information Science & Engineering',  'ISE',   'Dr. HoD ISE',         'hod.ise@kletech.ac.in',      'ise@kletech.ac.in',          '🖥️'),
('Electronics & Communication Engg',   'ECE',   'Dr. HoD ECE',         'hod.ece@kletech.ac.in',      'ece@kletech.ac.in',          '📡'),
('Electrical & Electronics Engg',      'EEE',   'Dr. HoD EEE',         'hod.eee@kletech.ac.in',      'eee@kletech.ac.in',          '⚡'),
('Mechanical Engineering',             'MECH',  'Dr. HoD Mech',        'hod.mech@kletech.ac.in',     'mech@kletech.ac.in',         '⚙️'),
('Civil Engineering',                  'CIVIL', 'Dr. HoD Civil',       'hod.civil@kletech.ac.in',    'civil@kletech.ac.in',        '🏗️'),
('Chemical Engineering',               'CHEM',  'Dr. HoD Chem',        'hod.chem@kletech.ac.in',     'chem@kletech.ac.in',         '🧪'),
('Biotechnology',                      'BT',    'Dr. HoD BT',          'hod.bt@kletech.ac.in',       'biotech@kletech.ac.in',      '🧬'),
('Mathematics',                        'MATH',  'Dr. HoD Math',        'hod.math@kletech.ac.in',     'maths@kletech.ac.in',        '📐'),
('Physics',                            'PHY',   'Dr. HoD Physics',     'hod.phy@kletech.ac.in',      'physics@kletech.ac.in',      '🔬'),
('MBA',                                'MBA',   'Dr. Director MBA',    'director.mba@kletech.ac.in', 'mba@kletech.ac.in',          '📊'),
('MCA',                                'MCA',   'Dr. HoD MCA',         'hod.mca@kletech.ac.in',      'mca@kletech.ac.in',          '🎓'),
('Library',                            'LIB',   'Chief Librarian',     'librarian@kletech.ac.in',    'library@kletech.ac.in',      '📚'),
('Hostel / Accommodation',             'HSTEL', 'Warden',              'warden@kletech.ac.in',       'hostel@kletech.ac.in',       '🏠'),
('Examination Cell',                   'EXAM',  'Controller of Exams', 'examcell@kletech.ac.in',     'examcell@kletech.ac.in',     '📝'),
('Finance & Accounts',                 'FIN',   'Finance Officer',     'finance@kletech.ac.in',      'finance@kletech.ac.in',      '💰'),
('IT & Technical Support',             'IT',    'IT Manager',          'itsupport@kletech.ac.in',    'itsupport@kletech.ac.in',    '🔧'),
('Sports & Physical Education',        'SPORTS','Sports Director',     'sports@kletech.ac.in',       'sports@kletech.ac.in',       '🏃'),
('Placement Cell',                     'PLCMT', 'Placement Officer',   'placements@kletech.ac.in',   'placements@kletech.ac.in',   '🤝'),
('Dean of Students',                   'DEAN',  'Dean of Students',    'dean.students@kletech.ac.in','dean.students@kletech.ac.in','🏛️');

-- ── SEED BUSES ───────────────────────────────────────────────
INSERT INTO buses (bus_number, capacity, driver_name, driver_phone) VALUES
('KA-22-F-1024 (Bus #01)', 52, 'Mallikarjun Patil', '+91 94481 23401'),
('KA-22-F-1025 (Bus #02)', 48, 'Suresh Jadhav',    '+91 94481 23402'),
('KA-22-F-1026 (Bus #03)', 55, 'Basavaraj Hiremath','+91 94481 23403'),
('KA-22-F-1027 (Bus #04)', 50, 'Gopal Hegde',      '+91 94481 23404');

-- ── SEED ROUTES ──────────────────────────────────────────────
INSERT INTO routes (route_number, route_name, start_point, end_point, stops_list, morning_schedule, evening_schedule) VALUES
('R-01', 'Belagavi Central Bus Terminal (CBT) to Campus', 'CBT Belagavi', 'KLE Tech Campus', 'CBT, Bogarves, Goaves, 3rd Gate, Udyambag Campus', '07:45 AM - 08:30 AM', '04:45 PM - 05:30 PM'),
('R-02', 'RPD Cross / Tilakwadi to Campus',               'RPD Cross',    'KLE Tech Campus', 'RPD Cross, Congress Road, 2nd Gate, Angol, Udyambag Campus', '08:00 AM - 08:35 AM', '04:45 PM - 05:25 PM'),
('R-03', 'Belagavi Railway Station to Campus',           'Railway Station', 'KLE Tech Campus', 'Railway Station, Chennamma Circle, Club Road, Camp, Udyambag Campus', '07:50 AM - 08:40 AM', '04:50 PM - 05:40 PM'),
('R-04', 'Vadgaon / Shahapur to Campus',                  'Shahapur Gate', 'KLE Tech Campus', 'Shahapur Gate, Khasbag, Basavan Galli, Old Belagavi, Udyambag Campus', '08:05 AM - 08:40 AM', '04:40 PM - 05:15 PM');

-- ── SEED ACCOUNTS (Default Password: Password@1234) ───────────
-- Bcrypt Hash for Password@1234: $2b$10$f6B0L6n9uXqM1p/r9D69gOiK0M68yH.T55a30X99p.sF70c7bFvyK
-- Also supported: Admin@1234 on admin account
INSERT INTO users (name, email, password, role, department, department_id) VALUES
('System Administrator', 'admin@kletech.ac.in', '$2b$10$f6B0L6n9uXqM1p/r9D69gOiK0M68yH.T55a30X99p.sF70c7bFvyK', 'admin', NULL, NULL),
('Ravi Kumar',           'ravi@kletech.ac.in',  '$2b$10$f6B0L6n9uXqM1p/r9D69gOiK0M68yH.T55a30X99p.sF70c7bFvyK', 'student', 'Computer Science & Engineering', 1),
('Prof. Anand Patil',    'cse.coord@kletech.ac.in','$2b$10$f6B0L6n9uXqM1p/r9D69gOiK0M68yH.T55a30X99p.sF70c7bFvyK', 'department_coordinator', 'Computer Science & Engineering', 1),
('Mr. Ramesh Kulkarni',  'bus.coord@kletech.ac.in','$2b$10$f6B0L6n9uXqM1p/r9D69gOiK0M68yH.T55a30X99p.sF70c7bFvyK', 'bus_coordinator', NULL, NULL);
