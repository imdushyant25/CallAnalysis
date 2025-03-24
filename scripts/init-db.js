// File location: scripts/init-db.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  console.log('Connecting to AWS RDS PostgreSQL...');
  
  // Create a connection pool to your AWS RDS
  const pool = new Pool({
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT || '5432'),
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Connected to the database successfully');
    
    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/init-schema.sql'),
      'utf8'
    );

    // Execute the SQL
    await pool.query(sql);
    console.log('Database initialized successfully with required tables and sample agent data');
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('agents', 'calls')
    `);
    
    console.log('Tables created:', tableCheck.rows.map(row => row.table_name).join(', '));
    
    // Verify agent data was inserted
    const agentCount = await pool.query('SELECT COUNT(*) FROM agents');
    console.log(`${agentCount.rows[0].count} agents in the database`);
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the initialization
initializeDatabase();