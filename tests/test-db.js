const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const res = await db.execute('SELECT 1 + 1 AS test');
    console.log('✅ Connection successful:', res.rows[0]);

    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('📋 Existing tables:', tables.rows.map(row => row.name));
  } catch (err) {
    console.error('❌ Database error:', err.message);
  }
}

main();