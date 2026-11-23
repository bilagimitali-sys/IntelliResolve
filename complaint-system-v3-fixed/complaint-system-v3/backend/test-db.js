const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testing 127.0.0.1...');
    const conn1 = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '' });
    console.log('✅ Connected to 127.0.0.1!');
    await conn1.end();
  } catch (err) {
    console.error('❌ Failed 127.0.0.1:', err.message);
  }

  try {
    console.log('Testing localhost...');
    const conn2 = await mysql.createConnection({ host: 'localhost', user: 'root', password: '' });
    console.log('✅ Connected to localhost!');
    await conn2.end();
  } catch (err) {
    console.error('❌ Failed localhost:', err.message);
  }
}

testConnection();
