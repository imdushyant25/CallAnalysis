// File location: app/api/dashboard/call-volume/route.ts
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

export async function GET(request: NextRequest) {
  try {
    // Get timeframe from query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'week';
    
    // Build date grouping and period based on timeframe
    let dateGrouping: string;
    let periodLimit: string;
    
    switch (timeframe) {
      case 'day':
        dateGrouping = "TO_CHAR(timestamp, 'YYYY-MM-DD')";
        periodLimit = '30 days';
        break;
      case 'month':
        dateGrouping = "TO_CHAR(timestamp, 'YYYY-MM')";
        periodLimit = '12 months';
        break;
      case 'week':
      default:
        dateGrouping = "TO_CHAR(DATE_TRUNC('week', timestamp), 'YYYY-MM-DD')";
        periodLimit = '12 weeks';
        break;
    }
    
    // Query to get call volume trends
    const query = `
      SELECT 
        ${dateGrouping} AS date,
        COUNT(*) AS calls
      FROM 
        calls
      WHERE 
        timestamp >= NOW() - INTERVAL '${periodLimit}'
      GROUP BY 
        date
      ORDER BY 
        date ASC
    `;
    
    const result = await pool.query(query);
    
    // Format the response
    const formattedData = result.rows.map(row => ({
      date: row.date,
      calls: parseInt(row.calls)
    }));
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching call volume trend:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch call volume trend',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}