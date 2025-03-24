// File location: app/api/dashboard/sentiment-trend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db';

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
        dateGrouping = "TO_CHAR(c.timestamp, 'YYYY-MM-DD')";
        periodLimit = '30 days';
        break;
      case 'month':
        dateGrouping = "TO_CHAR(c.timestamp, 'YYYY-MM')";
        periodLimit = '12 months';
        break;
      case 'week':
      default:
        dateGrouping = "TO_CHAR(DATE_TRUNC('week', c.timestamp), 'YYYY-MM-DD')";
        periodLimit = '12 weeks';
        break;
    }
    
    // Query to get sentiment trends
    const querystring = `
      SELECT 
        ${dateGrouping} AS date,
        AVG(
          CASE WHEN a.sentiment->>'overallScore' ~ E'^\\\\d+(\\\\.\\\\d+)?$' 
          THEN (a.sentiment->>'overallScore')::numeric 
          ELSE 0 
          END
        ) AS sentiment
      FROM 
        calls c
      JOIN 
        analysis a ON c.id = a.call_id
      WHERE 
        c.timestamp >= NOW() - INTERVAL '${periodLimit}'
      GROUP BY 
        date
      ORDER BY 
        date ASC
    `;
    
    const result = await query(querystring);
    
    // Format the response
    const formattedData = result.rows.map(row => ({
      date: row.date,
      sentiment: parseFloat(row.sentiment).toFixed(1)
    }));
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching sentiment trend:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch sentiment trend',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}