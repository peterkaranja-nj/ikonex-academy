import 'dotenv/config';
import { migrate, pool } from './index';
import { runSeed } from './seed';

async function run() {
  try {
    await migrate();
    await runSeed();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
