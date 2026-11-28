"""
KLE TECHNOLOGICAL UNIVERSITY — GRIEVANCE PORTAL v4
NON-DESTRUCTIVE DATABASE MIGRATION SCRIPT (migrate_v4.py)
Safe to run multiple times.
"""

from __future__ import annotations

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import bcrypt
import pymysql
from pymysql.cursors import DictCursor

import config


def migrate() -> None:
    db_name = config.DB_NAME
    conn = pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            cur.execute(f"USE `{db_name}`")

            print("====================================================")
            print("🚀 Running Non-Destructive Migration v4 (Python)")
            print("====================================================\n")

            def add_column_if_missing(table: str, column: str, definition: str) -> None:
                cur.execute(
                    """
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
                    """,
                    (db_name, table, column),
                )
                if cur.fetchone() is None:
                    cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                    print(f"  ✅ Added column {table}.{column}")
                else:
                    print(f"  ⏭️  Column {table}.{column} already exists")

            # ── 1. Departments ────────────────────────────────────────
            print("── Step 1: Departments table ──")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS departments (
                  id          INT AUTO_INCREMENT PRIMARY KEY,
                  name        VARCHAR(100)  NOT NULL,
                  code        VARCHAR(20)   NOT NULL UNIQUE,
                  hod_name    VARCHAR(100),
                  hod_email   VARCHAR(150),
                  dept_email  VARCHAR(150),
                  icon        VARCHAR(10),
                  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cur.execute("SELECT COUNT(*) AS cnt FROM departments")
            if cur.fetchone()["cnt"] == 0:
                cur.execute(
                    """
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
                    ('Dean of Students',                   'DEAN',  'Dean of Students',    'dean.students@kletech.ac.in','dean.students@kletech.ac.in','🏛️')
                    """
                )
                print("  ✅ 20 KLE Tech departments seeded")
            else:
                print("  ⏭️  Departments table already populated")

            # ── 2. Users ──────────────────────────────────────────────
            print("\n── Step 2: Users table enhancements ──")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
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
                )
                """
            )
            try:
                cur.execute(
                    """
                    ALTER TABLE users
                    MODIFY COLUMN role ENUM(
                      'student','faculty','staff','department_coordinator','bus_coordinator','admin'
                    ) NOT NULL DEFAULT 'student'
                    """
                )
                print("  ✅ Expanded users.role ENUM")
            except Exception as exc:
                print(f"  ⚠️  users.role modification warning: {exc}")

            add_column_if_missing("users", "department_id", "INT NULL")

            cur.execute(
                """
                SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'fk_users_dept'
                """,
                (db_name,),
            )
            if cur.fetchone() is None:
                try:
                    cur.execute(
                        """
                        ALTER TABLE users
                        ADD CONSTRAINT fk_users_dept
                        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
                        """
                    )
                    print("  ✅ Foreign key fk_users_dept added")
                except Exception as exc:
                    print(f"  ⚠️  FK fk_users_dept creation skipped: {exc}")

            cur.execute(
                """
                UPDATE users u
                JOIN departments d ON (
                  u.department = d.name OR
                  u.department = d.code OR
                  d.name LIKE CONCAT('%', u.department, '%')
                )
                SET u.department_id = d.id
                WHERE u.department_id IS NULL AND u.department IS NOT NULL
                """
            )
            print("  ✅ Mapped users to department_id IDs")

            # ── 3. Complaints, Responses & Notifications ──────────────
            print("\n── Step 3: Grievance & notification tables ──")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS complaints (
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
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS responses (
                  response_id  INT AUTO_INCREMENT PRIMARY KEY,
                  complaint_id INT  NOT NULL,
                  admin_id     INT  NOT NULL,
                  message      TEXT NOT NULL,
                  responded_at DATETIME DEFAULT NOW(),
                  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
                  FOREIGN KEY (admin_id)     REFERENCES users(user_id)           ON DELETE CASCADE
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                  notif_id     INT AUTO_INCREMENT PRIMARY KEY,
                  user_id      INT  NOT NULL,
                  complaint_id INT  DEFAULT NULL,
                  message      TEXT NOT NULL,
                  is_read      TINYINT(1) DEFAULT 0,
                  sent_at      DATETIME DEFAULT NOW(),
                  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
                """
            )
            add_column_if_missing("notifications", "sent_at", "DATETIME DEFAULT NOW()")

            try:
                cur.execute("ALTER TABLE complaints MODIFY COLUMN category VARCHAR(100) NOT NULL")
                print("  ✅ Confirmed complaints.category is VARCHAR(100)")
            except Exception as exc:
                print(f"  ⚠️  Category column notice: {exc}")

            add_column_if_missing("complaints", "original_description", "TEXT NULL")
            add_column_if_missing("complaints", "ai_structured_summary", "TEXT NULL")
            add_column_if_missing("complaints", "sentiment_score", "DECIMAL(3,2) DEFAULT 0.00")
            add_column_if_missing("complaints", "urgency_level", "ENUM('Normal','Urgent','Critical') DEFAULT 'Normal'")
            add_column_if_missing("complaints", "is_safety_hazard", "BOOLEAN DEFAULT FALSE")
            add_column_if_missing("complaints", "ai_confidence", "DECIMAL(3,2) DEFAULT NULL")
            add_column_if_missing("complaints", "assigned_coordinator_id", "INT NULL")

            cur.execute("UPDATE complaints SET original_description = description WHERE original_description IS NULL")

            # ── 4. Transportation (Bus) Tables ────────────────────────
            print("\n── Step 4: Transportation Module Tables ──")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS buses (
                  bus_id INT AUTO_INCREMENT PRIMARY KEY,
                  bus_number VARCHAR(50) NOT NULL UNIQUE,
                  capacity INT DEFAULT 50,
                  driver_name VARCHAR(100),
                  driver_phone VARCHAR(20),
                  is_active BOOLEAN DEFAULT TRUE,
                  created_at DATETIME DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS routes (
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
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS bus_complaints (
                  bus_complaint_id INT AUTO_INCREMENT PRIMARY KEY,
                  user_id INT NOT NULL,
                  bus_id INT NULL,
                  route_id INT NULL,
                  complaint_type ENUM(
                    'delay','driver_behaviour','cleanliness','maintenance',
                    'route_issue','overcrowding','safety'
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
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS bus_complaint_attachments (
                  attachment_id INT AUTO_INCREMENT PRIMARY KEY,
                  bus_complaint_id INT NOT NULL,
                  filename VARCHAR(255) NOT NULL,
                  original_name VARCHAR(255) NOT NULL,
                  mime_type VARCHAR(100) NOT NULL,
                  file_size INT NOT NULL,
                  created_at DATETIME DEFAULT NOW(),
                  FOREIGN KEY (bus_complaint_id) REFERENCES bus_complaints(bus_complaint_id) ON DELETE CASCADE
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS bus_complaint_responses (
                  response_id INT AUTO_INCREMENT PRIMARY KEY,
                  bus_complaint_id INT NOT NULL,
                  user_id INT NOT NULL,
                  message TEXT NOT NULL,
                  is_internal BOOLEAN DEFAULT FALSE,
                  responded_at DATETIME DEFAULT NOW(),
                  FOREIGN KEY (bus_complaint_id) REFERENCES bus_complaints(bus_complaint_id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS bus_complaint_audit_log (
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
                )
                """
            )
            print("  ✅ Transportation tables ready")

            # ── 5. Seed Buses & Routes ────────────────────────────────
            print("\n── Step 5: Seed Campus Fleet and Routes ──")
            cur.execute("SELECT COUNT(*) AS cnt FROM buses")
            if cur.fetchone()["cnt"] == 0:
                cur.execute(
                    """
                    INSERT INTO buses (bus_number, capacity, driver_name, driver_phone) VALUES
                    ('KA-22-F-1024 (Bus #01)', 52, 'Mallikarjun Patil', '+91 94481 23401'),
                    ('KA-22-F-1025 (Bus #02)', 48, 'Suresh Jadhav',    '+91 94481 23402'),
                    ('KA-22-F-1026 (Bus #03)', 55, 'Basavaraj Hiremath','+91 94481 23403'),
                    ('KA-22-F-1027 (Bus #04)', 50, 'Gopal Hegde',      '+91 94481 23404')
                    """
                )
                print("  ✅ Seeded 4 campus buses")

            cur.execute("SELECT COUNT(*) AS cnt FROM routes")
            if cur.fetchone()["cnt"] == 0:
                cur.execute(
                    """
                    INSERT INTO routes (route_number, route_name, start_point, end_point, stops_list, morning_schedule, evening_schedule) VALUES
                    ('R-01', 'Belagavi Central Bus Terminal (CBT) to Campus', 'CBT Belagavi', 'KLE Tech Campus', 'CBT, Bogarves, Goaves, 3rd Gate, Udyambag Campus', '07:45 AM - 08:30 AM', '04:45 PM - 05:30 PM'),
                    ('R-02', 'RPD Cross / Tilakwadi to Campus',               'RPD Cross',    'KLE Tech Campus', 'RPD Cross, Congress Road, 2nd Gate, Angol, Udyambag Campus', '08:00 AM - 08:35 AM', '04:45 PM - 05:25 PM'),
                    ('R-03', 'Belagavi Railway Station to Campus',           'Railway Station', 'KLE Tech Campus', 'Railway Station, Chennamma Circle, Club Road, Camp, Udyambag Campus', '07:50 AM - 08:40 AM', '04:50 PM - 05:40 PM'),
                    ('R-04', 'Vadgaon / Shahapur to Campus',                  'Shahapur Gate', 'KLE Tech Campus', 'Shahapur Gate, Khasbag, Basavan Galli, Old Belagavi, Udyambag Campus', '08:05 AM - 08:40 AM', '04:40 PM - 05:15 PM')
                    """
                )
                print("  ✅ Seeded 4 campus transport routes")

            # ── 6. Seed User Accounts ─────────────────────────────────
            print("\n── Step 6: Seed User Accounts ──")
            hashed_password = bcrypt.hashpw(b"Password@1234", bcrypt.gensalt(rounds=10)).decode("utf-8")

            def seed_user(name: str, email: str, role: str, dept_code: str | None) -> None:
                dept_id = None
                dept_name = None
                if dept_code:
                    cur.execute("SELECT id, name FROM departments WHERE code = %s", (dept_code,))
                    d = cur.fetchone()
                    if d:
                        dept_id = d["id"]
                        dept_name = d["name"]

                cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
                if cur.fetchone() is None:
                    cur.execute(
                        """
                        INSERT INTO users (name, email, password, role, department, department_id, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                        """,
                        (name, email, hashed_password, role, dept_name, dept_id),
                    )
                    print(f"  ✅ Created user: {email} ({role})")
                else:
                    cur.execute(
                        """
                        UPDATE users SET role = %s, department = %s, department_id = %s, password = %s
                        WHERE email = %s
                        """,
                        (role, dept_name, dept_id, hashed_password, email),
                    )
                    print(f"  🔄 Updated user: {email} ({role})")

            seed_user("System Administrator", "admin@kletech.ac.in", "admin", None)
            seed_user("Ravi Kumar", "ravi@kletech.ac.in", "student", "CSE")
            seed_user("Prof. Anand Patil", "cse.coord@kletech.ac.in", "department_coordinator", "CSE")
            seed_user("Mr. Ramesh Kulkarni", "bus.coord@kletech.ac.in", "bus_coordinator", None)
            seed_user("Dr. Priya Sharma", "priya@kletech.ac.in", "department_coordinator", "CSE")

            print("\n====================================================")
            print("🎉 Migration v4 Completed Successfully!")
            print("Standard Credentials (All accounts): Password@1234")
            print("====================================================\n")
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
