// File location: app/api/upload/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

// Define a type for PostgreSQL errors
interface PostgresError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
  severity?: string;
}

// Create a connection pool with proper SSL handling
const createDbPool = () => {
  // Determine SSL configuration based on environment
  const sslConfig = process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : // For production, often needs this with AWS RDS
    (process.env.RDS_SSL === 'true' ? 
      { rejectUnauthorized: false } : // Explicitly enabled
      false); // Explicitly disabled
  
  console.log('Database connection config:', {
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT || '5432'),
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME,
    ssl: sslConfig ? 'enabled' : 'disabled'
  });
  
  return new Pool({
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT || '5432'),
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    ssl: sslConfig,
    // Add slightly longer timeouts for debugging
    connectionTimeoutMillis: 10000,
    query_timeout: 10000
  });
};

export async function POST(request: NextRequest) {
  let client = null;
  let pool = null;
  
  try {
    const body = await request.json();
    const { s3Key, metadata } = body;
    
    if (!s3Key) {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 });
    }
    
    // Validate and provide defaults for metadata
    const validatedMetadata = {
      agentId: metadata?.agentId || 'unassigned',
      callDirection: metadata?.callDirection || 'inbound',
      callerId: metadata?.callerId || '',
      callStartTime: metadata?.callStartTime || new Date().toISOString(),
      callEndTime: metadata?.callEndTime || new Date().toISOString(),
      processingStatus: 'pending'
    };
    
    // Generate a unique ID for the call record
    const callId = uuidv4();
    
    try {
      // Create connection pool
      pool = createDbPool();
      
      // Test connection with a simple query before proceeding
      await pool.query('SELECT NOW()');
      console.log('Database connection test successful');
      
      // Get client from pool
      client = await pool.connect();
      
      // Begin transaction
      await client.query('BEGIN');
      
      // First, check if agent ID exists
      const agentResult = await client.query(
        'SELECT id FROM agents WHERE agent_id = $1',
        [validatedMetadata.agentId]
      );
      
      // Use unassigned if agent not found
      let agentDbId;
      if (agentResult.rows.length === 0) {
        const unassignedResult = await client.query(
          'SELECT id FROM agents WHERE agent_id = $1',
          ['unassigned']
        );
        
        if (unassignedResult.rows.length === 0) {
          // Create an unassigned agent if it doesn't exist
          const newAgentResult = await client.query(
            'INSERT INTO agents (agent_id, name, team) VALUES ($1, $2, $3) RETURNING id',
            ['unassigned', 'Unassigned', 'Unassigned']
          );
          agentDbId = newAgentResult.rows[0].id;
        } else {
          agentDbId = unassignedResult.rows[0].id;
        }
      } else {
        agentDbId = agentResult.rows[0].id;
      }
      
      // Insert call record
      const insertCallQuery = `
        INSERT INTO calls (
          id, 
          s3_audio_key, 
          timestamp, 
          duration, 
          agent_id, 
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const callValues = [
        callId,
        s3Key,
        new Date().toISOString(),
        0,
        agentDbId,
        JSON.stringify(validatedMetadata)
      ];
      
      const callResult = await client.query(insertCallQuery, callValues);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Successfully created database record for call ${callId}, S3 key: ${s3Key}`);
      
    } catch (error) {
      // Rollback on error
      if (client) await client.query('ROLLBACK').catch(e => console.error('Rollback error:', e));
      
      console.error('Database error:', error);
      
      // Cast error to our PostgreSQL error type with a type guard
      const dbError = error as PostgresError;
      
      // Check for specific SSL error messages
      const errorMsg = dbError.message || '';
      
      if (errorMsg.includes('SSL')) {
        console.error('SSL connection error detected. Try setting RDS_SSL=false in your .env file');
      } else if (errorMsg.includes('password')) {
        console.error('Authentication error detected. Check username/password in .env file');
      } else if (errorMsg.includes('timeout')) {
        console.error('Connection timeout. Check if database is accessible from your network');
      } else if (errorMsg.includes('pg_hba.conf')) {
        console.error('Host-based authentication issue. Check your PostgreSQL server configuration');
      }
      
      // Return the database error for debugging
      return NextResponse.json({ 
        id: callId, // Still return the generated ID
        status: 'partial_success',
        message: 'File uploaded to S3 successfully, but database record creation failed',
        dbError: {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          hint: dbError.hint,
          severity: dbError.severity
        }
      });
    }
    
    return NextResponse.json({ 
      id: callId, 
      status: 'success',
      message: 'File uploaded successfully and database record created' 
    });
    
  } catch (error) {
    console.error('Error in upload completion handler:', error);
    
    return NextResponse.json({ 
      error: 'Failed to complete upload process',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) client.release();
    if (pool) pool.end().catch(e => console.error('Error closing pool:', e));
  }
}