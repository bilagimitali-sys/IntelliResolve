/**
 * ============================================================
 * KLE TECHNOLOGICAL UNIVERSITY — GRIEVANCE PORTAL v4
 * SAFE ROLLBACK SCRIPT (rollback-v4.js)
 * ============================================================
 * Drops the tables created in v4 without destroying core users/complaints.
 *
 * To run:
 *   cd backend
 *   node rollback-v4.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function rollback() {
  const dbName = process.env.DB_NAME || 'complaint_db';
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await db.query(`USE \`${dbName}\``);

  console.log('⚠️ Reverting v4 migration changes...\n');

  // Drop transportation tables
  await db.query('DROP TABLE IF EXISTS bus_complaint_audit_log');
  await db.query('DROP TABLE IF EXISTS bus_complaint_responses');
  await db.query('DROP TABLE IF EXISTS bus_complaint_attachments');
  await db.query('DROP TABLE IF EXISTS bus_complaints');
  await db.query('DROP TABLE IF EXISTS routes');
  await db.query('DROP TABLE IF EXISTS buses');
  console.log('✅ Dropped transportation tables');

  // Drop newly added columns from complaints table
  async function dropColumnIfExists(table, column) {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'complaint_db', table, column]
    );
    if (cols.length > 0) {
      await db.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
      console.log(`✅ Dropped ${table}.${column}`);
    }
  }

  await dropColumnIfExists('complaints', 'original_description');
  await dropColumnIfExists('complaints', 'ai_structured_summary');
  await dropColumnIfExists('complaints', 'sentiment_score');
  await dropColumnIfExists('complaints', 'urgency_level');
  await dropColumnIfExists('complaints', 'is_safety_hazard');
  await dropColumnIfExists('complaints', 'ai_confidence');
  await dropColumnIfExists('complaints', 'assigned_coordinator_id');

  console.log('\n🎉 Rollback complete!\n');
  await db.end();
}

rollback().catch(err => {
  console.error('❌ Rollback failed:', err);
  process.exit(1);
});
