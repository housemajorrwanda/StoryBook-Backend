// scripts/wait-for-db.js
const { execSync } = require('child_process');
const { setTimeout } = require('timers/promises');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function waitForDatabase() {
  console.log('⏳ Waiting for database to be ready...');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔍 Testing database connection (attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Use Prisma to execute a simple query
      execSync('npx prisma db execute --stdin --schema ./prisma/schema.prisma', {
        input: 'SELECT 1;',
        stdio: ['pipe', 'ignore', 'ignore']
      });
      
      console.log('✅ Database is ready!');
      return true;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Database not ready. Retrying in ${RETRY_DELAY / 1000}s...`);
        await setTimeout(RETRY_DELAY);
      } else {
        console.error('❌ ERROR: Database connection timeout');
        console.error('Please check:');
        console.error('  1. DATABASE_URL environment variable');
        console.error('  2. Database service is running');
        console.error('  3. Network connectivity');
        process.exit(1);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  waitForDatabase().catch(error => {
    console.error('Failed to wait for database:', error);
    process.exit(1);
  });
}

module.exports = waitForDatabase;