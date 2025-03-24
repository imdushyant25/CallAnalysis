import { Pool } from 'pg';

// Create a singleton pool that's properly initialized on first use
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    console.log('Database connection config:', {
      host: process.env.RDS_HOST,
      port: process.env.RDS_PORT,
      database: process.env.RDS_DATABASE,
      user: process.env.RDS_USERNAME,
      ssl: process.env.RDS_SSL === 'true' ? 'enabled' : 'disabled'
    });
    
    _pool = new Pool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || '5432'),
      database: process.env.RDS_DATABASE,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    // Add event handlers for connection issues
    _pool.on('error', (err) => {
      console.error('Unexpected database pool error', err);
      _pool = null; // Reset pool on error
    });
  }
  
  return _pool;
}

// Optional utility for common queries
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}