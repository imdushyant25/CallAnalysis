// File location: app/api/calls/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export async function GET(request: NextRequest) {
  try {
    // Parse pagination parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM calls');
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    
    // Query calls with pagination, ordering by most recent first
    const callsQuery = `
      SELECT 
        c.id, 
        c.s3_audio_key, 
        c.timestamp, 
        c.duration, 
        c.metadata,
        a.agent_id,
        a.name as agent_name
      FROM 
        calls c
      LEFT JOIN 
        agents a ON c.agent_id = a.id
      ORDER BY 
        c.timestamp DESC
      LIMIT $1 OFFSET $2
    `;
    
    const callsResult = await pool.query(callsQuery, [limit, offset]);
    
    // Format the response
    const calls = callsResult.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      duration: row.duration,
      s3AudioKey: row.s3_audio_key,
      agentId: row.agent_id,
      agentName: row.agent_name,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));
    
    return NextResponse.json({
      calls,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}