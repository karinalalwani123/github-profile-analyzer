/**
 * Simple migration runner.
 * Reads sql/schema.sql and executes it against the configured MySQL server.
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Connect without specifying a database first, since the schema creates it.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('Running schema migration...');
    await connection.query(sql);
    console.log('✅ Database and tables created/verified successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

migrate();
