/**
 * ── MIGRATION SCRIPT ─────────────────────────────────────────
 * Run once:  node migrate.js
 *
 * Creates the departments table, seeds KLE Tech Belagavi departments,
 * and adds new columns to the complaints table for:
 *   - AI image detection flag
 *   - Voice note path
 *   - Department routing
 *
 * Safe to run multiple times — uses IF NOT EXISTS / IF NOT EXISTS checks.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'complaint_db',
  });

  console.log('🔌 Connected to database. Running migrations...\n');

  // ── 1. Create departments table ────────────────────────────
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
  console.log('✅ departments table ready');

  // ── 2. Seed departments (skip if already seeded) ───────────
  const [existing] = await db.query('SELECT COUNT(*) AS cnt FROM departments');
  if (existing[0].cnt === 0) {
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
    console.log('✅ 20 KLE Tech Belagavi departments seeded');
  } else {
    console.log('⏭️  Departments already seeded, skipping');
  }

  // ── 3. Add new columns to complaints table ─────────────────
  // Helper: add column if it doesn't already exist
  async function addColumnIfMissing(table, column, definition) {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'complaint_db', table, column]
    );
    if (cols.length === 0) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`  ✅ Added ${table}.${column}`);
    } else {
      console.log(`  ⏭️  ${table}.${column} already exists`);
    }
  }

  console.log('\n── Adding columns to complaints table ──');
  await addColumnIfMissing('complaints', 'is_ai_image',     'TINYINT(1) DEFAULT 0');
  await addColumnIfMissing('complaints', 'voice_note_path', 'VARCHAR(255) DEFAULT NULL');
  await addColumnIfMissing('complaints', 'department_id',   'INT DEFAULT NULL');
  await addColumnIfMissing('complaints', 'department_code', 'VARCHAR(20) DEFAULT NULL');
  await addColumnIfMissing('complaints', 'routed_to_email', 'VARCHAR(150) DEFAULT NULL');

  // ── 4. Add foreign key (skip if exists) ────────────────────
  const [fks] = await db.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'complaints'
       AND CONSTRAINT_NAME = 'fk_complaint_dept'`,
    [process.env.DB_NAME || 'complaint_db']
  );
  if (fks.length === 0) {
    try {
      await db.query(`
        ALTER TABLE complaints
          ADD CONSTRAINT fk_complaint_dept
          FOREIGN KEY (department_id) REFERENCES departments(id)
      `);
      console.log('  ✅ Foreign key fk_complaint_dept added');
    } catch (e) {
      console.log('  ⚠️  FK creation skipped:', e.message);
    }
  } else {
    console.log('  ⏭️  FK fk_complaint_dept already exists');
  }

  // ── 5. Update seed users to @kletech.ac.in ─────────────────
  console.log('\n── Updating seed user emails ──');
  const emailUpdates = [
    ['admin@college.edu',  'admin@kletech.ac.in'],
    ['ravi@student.edu',   'ravi@kletech.ac.in'],
    ['priya@college.edu',  'priya@kletech.ac.in'],
  ];
  for (const [oldEmail, newEmail] of emailUpdates) {
    const [result] = await db.query(
      'UPDATE users SET email = ? WHERE email = ?',
      [newEmail, oldEmail]
    );
    if (result.affectedRows > 0) {
      console.log(`  ✅ ${oldEmail} → ${newEmail}`);
    } else {
      console.log(`  ⏭️  ${oldEmail} not found (already updated or missing)`);
    }
  }

  console.log('\n🎉 Migration complete!\n');
  await db.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
