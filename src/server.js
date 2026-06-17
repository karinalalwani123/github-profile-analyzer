require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await testConnection();
    console.log('✅ MySQL connection established.');
  } catch (err) {
    console.error('❌ Could not connect to MySQL:', err.message);
    console.error('   Check your .env DB_* values and that MySQL is running.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`   Local: http://localhost:${PORT}`);
  });
}

start();
