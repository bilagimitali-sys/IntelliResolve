/**
 * ============================================================
 * KLE TECHNOLOGICAL UNIVERSITY — GRIEVANCE PORTAL v4
 * NON-DESTRUCTIVE DATABASE MIGRATION SCRIPT (migrate-v4.js)
 * ============================================================
 * Safe to run multiple times. Uses IF NOT EXISTS, INFORMATION_SCHEMA
 * checks, and non-destructive ALTER TABLE commands.
 *
 * To run:
 *   cd backend
 *   node migrate-v4.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function migrate() {
  const dbName = process.env.DB_NAME || 'complaint_db';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';

  // 1. Connect to MySQL server (without specifying DB in case it does not exist yet)
  const db = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
  });

  // Ensure target database exists and switch to it
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await db.query(`USE \`${dbName}\``);

  console.log('====================================================');
  console.log('🚀 Running Non-Destructive Migration v4 for Grievance Portal');
  console.log('====================================================\n');

  // Helper to add column if not exists
  async function addColumnIfMissing(table, column, definition) {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'complaint_db', table, column]
    );
    if (cols.length === 0) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`  ✅ Added column ${table}.${column}`);
    } else {
      console.log(`  ⏭️  Column ${table}.${column} already exists`);
    }
  }

  // ── 1. Ensure departments table exists & is seeded ─────────────────
  console.log('── Step 1: Departments table ──');
  await db.query(`
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
  `);

  const [existingDepts] = await db.query('SELECT COUNT(*) AS cnt FROM departments');
  if (existingDepts[0].cnt === 0) {
    await db.query(`
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
    `);
    console.log('  ✅ 20 KLE Tech departments seeded');
  } else {
    console.log('  ⏭️  Departments table already populated');
  }

  // ── 2. Ensure Users table exists & apply enhancements ────────
  console.log('\n── Step 2: Users table enhancements ──');
  await db.query(`
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
  `);

  // Expand role ENUM to include 'department_coordinator' and 'bus_coordinator'
  try {
    await db.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM(
        'student',
        'faculty',
        'staff',
        'department_coordinator',
        'bus_coordinator',
        'admin'
      ) NOT NULL DEFAULT 'student'
    `);
    console.log('  ✅ Expanded users.role ENUM');
  } catch (err) {
    console.log('  ⚠️  users.role modification warning:', err.message);
  }

  await addColumnIfMissing('users', 'department_id', 'INT NULL');

  // Add FK for users.department_id if not present
  const [userFks] = await db.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'fk_users_dept'`,
    [process.env.DB_NAME || 'complaint_db']
  );
  if (userFks.length === 0) {
    try {
      await db.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_dept
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      `);
      console.log('  ✅ Foreign key fk_users_dept added');
    } catch (e) {
      console.log('  ⚠️  FK fk_users_dept creation skipped:', e.message);
    }
  }

  // Link existing users to department_id based on department column string
  await db.query(`
    UPDATE users u
    JOIN departments d ON (
      u.department = d.name OR
      u.department = d.code OR
      d.name LIKE CONCAT('%', u.department, '%')
    )
    SET u.department_id = d.id
    WHERE u.department_id IS NULL AND u.department IS NOT NULL
  `);
  console.log('  ✅ Mapped users to department_id IDs');

  // ── 3. Ensure complaints, responses & notifications tables exist ────
  console.log('\n── Step 3: Grievance & notification tables ──');
  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS responses (
      response_id  INT AUTO_INCREMENT PRIMARY KEY,
      complaint_id INT  NOT NULL,
      admin_id     INT  NOT NULL,
      message      TEXT NOT NULL,
      responded_at DATETIME DEFAULT NOW(),
      FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id)     REFERENCES users(user_id)           ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notif_id     INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT  NOT NULL,
      complaint_id INT  DEFAULT NULL,
      message      TEXT NOT NULL,
      is_read      TINYINT(1) DEFAULT 0,
      created_at   DATETIME DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Make sure category is VARCHAR(100)
  try {
    await db.query('ALTER TABLE complaints MODIFY COLUMN category VARCHAR(100) NOT NULL');
    console.log('  ✅ Confirmed complaints.category is VARCHAR(100)');
  } catch (e) {
    console.log('  ⚠️  Category column modification notice:', e.message);
  }

  await addColumnIfMissing('complaints', 'original_description', 'TEXT NULL');
  await addColumnIfMissing('complaints', 'ai_structured_summary', 'TEXT NULL');
  await addColumnIfMissing('complaints', 'sentiment_score', 'DECIMAL(3,2) DEFAULT 0.00');
  await addColumnIfMissing('complaints', 'urgency_level', "ENUM('Normal','Urgent','Critical') DEFAULT 'Normal'");
  await addColumnIfMissing('complaints', 'is_safety_hazard', 'BOOLEAN DEFAULT FALSE');
  await addColumnIfMissing('complaints', 'ai_confidence', 'DECIMAL(3,2) DEFAULT NULL');
  await addColumnIfMissing('complaints', 'assigned_coordinator_id', 'INT NULL');

  // Backfill original_description for existing complaints if null
  await db.query(`
    UPDATE complaints
    SET original_description = description
    WHERE original_description IS NULL
  `);

  // ── 4. Create Transportation (Bus) Tables ─────────────────────────
  console.log('\n── Step 4: Transportation Module Tables ──');

  // Table: buses
  await db.query(`
    CREATE TABLE IF NOT EXISTS buses (
      bus_id INT AUTO_INCREMENT PRIMARY KEY,
      bus_number VARCHAR(50) NOT NULL UNIQUE,
      capacity INT DEFAULT 50,
      driver_name VARCHAR(100),
      driver_phone VARCHAR(20),
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT NOW()
    )
  `);
  console.log('  ✅ buses table ready');

  // Table: routes
  await db.query(`
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
  `);
  console.log('  ✅ routes table ready');

  // Table: bus_complaints
  await db.query(`
    CREATE TABLE IF NOT EXISTS bus_complaints (
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
    )
  `);
  console.log('  ✅ bus_complaints table ready');

  // Table: bus_complaint_attachments
  await db.query(`
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
  `);
  console.log('  ✅ bus_complaint_attachments table ready');

  // Table: bus_complaint_responses
  await db.query(`
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
  `);
  console.log('  ✅ bus_complaint_responses table ready');

  // Table: bus_complaint_audit_log
  await db.query(`
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
  `);
  console.log('  ✅ bus_complaint_audit_log table ready');

  // ── 5. Seed Buses and Routes ──────────────────────────────────────
  console.log('\n── Step 5: Seed Campus Fleet and Routes ──');
  const [busesCount] = await db.query('SELECT COUNT(*) AS cnt FROM buses');
  if (busesCount[0].cnt === 0) {
    await db.query(`
      INSERT INTO buses (bus_number, capacity, driver_name, driver_phone) VALUES
      ('KA-22-F-1024 (Bus #01)', 52, 'Mallikarjun Patil', '+91 94481 23401'),
      ('KA-22-F-1025 (Bus #02)', 48, 'Suresh Jadhav',    '+91 94481 23402'),
      ('KA-22-F-1026 (Bus #03)', 55, 'Basavaraj Hiremath','+91 94481 23403'),
      ('KA-22-F-1027 (Bus #04)', 50, 'Gopal Hegde',      '+91 94481 23404')
    `);
    console.log('  ✅ Seeded 4 campus buses');
  }

  const [routesCount] = await db.query('SELECT COUNT(*) AS cnt FROM routes');
  if (routesCount[0].cnt === 0) {
    await db.query(`
      INSERT INTO routes (route_number, route_name, start_point, end_point, stops_list, morning_schedule, evening_schedule) VALUES
      ('R-01', 'Belagavi Central Bus Terminal (CBT) to Campus', 'CBT Belagavi', 'KLE Tech Campus', 'CBT, Bogarves, Goaves, 3rd Gate, Udyambag Campus', '07:45 AM - 08:30 AM', '04:45 PM - 05:30 PM'),
      ('R-02', 'RPD Cross / Tilakwadi to Campus',               'RPD Cross',    'KLE Tech Campus', 'RPD Cross, Congress Road, 2nd Gate, Angol, Udyambag Campus', '08:00 AM - 08:35 AM', '04:45 PM - 05:25 PM'),
      ('R-03', 'Belagavi Railway Station to Campus',           'Railway Station', 'KLE Tech Campus', 'Railway Station, Chennamma Circle, Club Road, Camp, Udyambag Campus', '07:50 AM - 08:40 AM', '04:50 PM - 05:40 PM'),
      ('R-04', 'Vadgaon / Shahapur to Campus',                  'Shahapur Gate', 'KLE Tech Campus', 'Shahapur Gate, Khasbag, Basavan Galli, Old Belagavi, Udyambag Campus', '08:05 AM - 08:40 AM', '04:40 PM - 05:15 PM')
    `);
    console.log('  ✅ Seeded 4 campus transport routes');
  }

  // ── 6. Seed Accounts per Role with Verified Passwords ──────────────
  console.log('\n── Step 6: Seed User Accounts ──');
  const defaultPassword = 'Password@1234';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Helper to upsert user
  async function seedUser({ name, email, role, departmentCode }) {
    let deptId = null;
    let deptName = null;
    if (departmentCode) {
      const [[d]] = await db.query('SELECT id, name FROM departments WHERE code = ?', [departmentCode]);
      if (d) {
        deptId = d.id;
        deptName = d.name;
      }
    }

    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO users (name, email, password, role, department, department_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [name, email, hashedPassword, role, deptName, deptId]
      );
      console.log(`  ✅ Created user: ${email} (${role})`);
    } else {
      await db.query(
        `UPDATE users
         SET role = ?, department = ?, department_id = ?, password = ?
         WHERE email = ?`,
        [role, deptName, deptId, hashedPassword, email]
      );
      console.log(`  🔄 Updated user: ${email} (${role})`);
    }
  }

  // Seed 1: Admin
  await seedUser({
    name: 'System Administrator',
    email: 'admin@kletech.ac.in',
    role: 'admin',
    departmentCode: null,
  });

  // Seed 2: Student
  await seedUser({
    name: 'Ravi Kumar',
    email: 'ravi@kletech.ac.in',
    role: 'student',
    departmentCode: 'CSE',
  });

  // Seed 3: Department Coordinator (CSE)
  await seedUser({
    name: 'Prof. Anand Patil',
    email: 'cse.coord@kletech.ac.in',
    role: 'department_coordinator',
    departmentCode: 'CSE',
  });

  // Seed 4: Bus Coordinator
  await seedUser({
    name: 'Mr. Ramesh Kulkarni',
    email: 'bus.coord@kletech.ac.in',
    role: 'bus_coordinator',
    departmentCode: null,
  });

  // Also retain faculty Priya as faculty or department_coordinator
  await seedUser({
    name: 'Dr. Priya Sharma',
    email: 'priya@kletech.ac.in',
    role: 'department_coordinator',
    departmentCode: 'CSE',
  });

  console.log('\n====================================================');
  console.log('🎉 Migration v4 Completed Successfully!');
  console.log('Standard Credentials (All accounts):');
  console.log('  Password: Password@1234');
  console.log('  Admin:                  admin@kletech.ac.in');
  console.log('  Student:                ravi@kletech.ac.in');
  console.log('  Dept Coordinator (CSE): cse.coord@kletech.ac.in');
  console.log('  Bus Coordinator:        bus.coord@kletech.ac.in');
  console.log('====================================================\n');

  await db.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
