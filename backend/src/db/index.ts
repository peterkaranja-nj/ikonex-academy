import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

const sharedPoolOptions: Partial<PoolConfig> = {
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Use EITHER connectionString OR individual fields — never mix them.
// Mixing causes pg to override connectionString credentials with the fallback values.
const config: PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ...sharedPoolOptions }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'ikonex_academy',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ...sharedPoolOptions,
    };

export const pool = new Pool(config);

// Log but never crash on idle-client errors — pg drops idle connections normally
pool.on('error', (err) => {
  console.error('Idle client error (non-fatal):', err.message);
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return { rows: res.rows, rowCount: res.rowCount || 0 };
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('✅ Database migration complete');
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
