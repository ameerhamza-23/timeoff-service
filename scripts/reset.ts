import axios from 'axios';

const HCM_URL = process.env.HCM_BASE_URL || 'http://localhost:4000';

async function reset() {
  console.log('🧹 Resetting HCM data...\n');

  try {
    await axios.post(`${HCM_URL}/hcm/reset`);
    console.log('HCM data reset successfully!');
    console.log('\n Note: The local database will be reset when you restart the application');
    console.log('   (if using in-memory SQLite or :memory: DB_PATH)\n');
  } catch (error: any) {
    console.error('Reset failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

reset();
