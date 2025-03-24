// File location: app/api/calls/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize database connection pool
const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;
    
    // Query to get call details with agent information
    const query = `
      SELECT 
        c.id, 
        c.s3_audio_key, 
        c.timestamp, 
        c.duration, 
        c.metadata,
        a.id as agent_db_id,
        a.agent_id,
        a.name as agent_name
      FROM 
        calls c
      LEFT JOIN 
        agents a ON c.agent_id = a.id
      WHERE 
        c.id = $1
    `;
    
    const result = await pool.query(query, [callId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    
    // Format the response
    const call = result.rows[0];
    
    // Parse metadata JSON if it's a string
    if (call.metadata && typeof call.metadata === 'string') {
      call.metadata = JSON.parse(call.metadata);
    }
    
    return NextResponse.json({
      id: call.id,
      s3AudioKey: call.s3_audio_key,
      timestamp: call.timestamp,
      duration: call.duration,
      agentId: call.agent_id,
      agentName: call.agent_name,
      metadata: call.metadata
    });
    
  } catch (error) {
    console.error('Error fetching call:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch call',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}