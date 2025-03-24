// File location: scripts/create-transcriptions-table.js
require('dotenv').config();
const { Pool } = require('pg');

async function createTranscriptionsTable() {
  console.log('Connecting to PostgreSQL database...');
  
  // Create a connection pool
  const pool = new Pool({
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT || '5432'),
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'transcriptions'
      )
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('Transcriptions table already exists');
    } else {
      // Create the transcriptions table
      await pool.query(`
        CREATE TABLE transcriptions (
          id UUID PRIMARY KEY,
          call_id UUID REFERENCES calls(id),
          full_text TEXT NOT NULL,
          segments JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      
      // Create an index for call_id
      await pool.query('CREATE INDEX idx_transcriptions_call_id ON transcriptions(call_id)');
      
      // Create updated_at trigger
      await pool.query(`
        CREATE TRIGGER update_transcriptions_updated_at 
        BEFORE UPDATE ON transcriptions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      
      console.log('Transcriptions table created successfully');
    }
    
  } catch (error) {
    console.error('Error creating transcriptions table:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

createTranscriptionsTable();