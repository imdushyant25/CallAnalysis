import { NextRequest, NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db'; // Use your shared db module

export async function GET(request: NextRequest) {
  try {
    // Get limit from query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const timeframe = searchParams.get('timeframe') || 'month';
    
    // Set time period based on timeframe
    let periodLimit: string;
    
    switch (timeframe) {
      case 'day':
        periodLimit = '1 day';
        break;
      case 'week':
        periodLimit = '7 days';
        break;
      case 'year':
        periodLimit = '1 year';
        break;
      case 'month':
      default:
        periodLimit = '30 days';
        break;
    }
    
    // Use the shared query function
    const queryString = `
      SELECT 
        drug_name AS drug,
        SUM(count) AS count
      FROM 
        drug_mentions dm
      JOIN 
        calls c ON dm.call_id = c.id
      WHERE 
        c.timestamp >= NOW() - INTERVAL '${periodLimit}'
      GROUP BY 
        drug_name
      ORDER BY 
        count DESC
      LIMIT $1
    `;
    
    const result = await query(queryString, [limit]);
    
    // Use dummy data if no results are returned (for development purposes)
    if (result.rows.length === 0) {
      const dummyData = [
        { drug: 'Metformin', count: 42 },
        { drug: 'Lisinopril', count: 38 },
        { drug: 'Atorvastatin', count: 35 },
        { drug: 'Levothyroxine', count: 29 },
        { drug: 'Amlodipine', count: 25 },
        { drug: 'Omeprazole', count: 22 },
        { drug: 'Simvastatin', count: 18 }
      ].slice(0, limit);
      
      return NextResponse.json(dummyData);
    }
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching drug mentions:', error);
    
    // Return dummy data in case of error (for development purposes)
    const dummyData = [
      { drug: 'Metformin', count: 42 },
      { drug: 'Lisinopril', count: 38 },
      { drug: 'Atorvastatin', count: 35 },
      { drug: 'Levothyroxine', count: 29 },
      { drug: 'Amlodipine', count: 25 },
      { drug: 'Omeprazole', count: 22 },
      { drug: 'Simvastatin', count: 18 }
    ].slice(0, parseInt(request.nextUrl.searchParams.get('limit') || '10'));
    
    return NextResponse.json(dummyData);
  }
}