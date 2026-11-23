const mysql = require('mysql2');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'complaint_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit:      0
});

// Test connection on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   → Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in backend/.env');
    // Don't exit — let the server start so the error is visible
    return;
  }
  console.log('✅ MySQL Connected successfully!');
  connection.release();
});

module.exports = db.promise();
