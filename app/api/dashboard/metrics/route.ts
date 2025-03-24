// File location: app/api/dashboard/metrics/route.ts
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
    // Get total call count
    const callCountQuery = 'SELECT COUNT(*) FROM calls';
    const callCountResult = await pool.query(callCountQuery);
    const totalCalls = callCountResult.rows[0].count || 0;
    
    // Get average sentiment (from analysis table)
    const sentimentQuery = `
      SELECT AVG(
        CASE WHEN sentiment->>'overallScore' ~ E'^\\\\d+(\\\\.\\\\d+)?$' 
        THEN (sentiment->>'overallScore')::numeric 
        ELSE 0 
        END
      ) AS avg_sentiment
      FROM analysis
    `;
    const sentimentResult = await pool.query(sentimentQuery);
    const avgSentiment = sentimentResult.rows[0].avg_sentiment 
      ? parseFloat(sentimentResult.rows[0].avg_sentiment).toFixed(1) 
      : '0';
    
    // Get flagged calls count
    const flaggedQuery = `
      SELECT COUNT(DISTINCT call_id) AS flagged_count
      FROM call_flags
    `;
    const flaggedResult = await pool.query(flaggedQuery);
    const flaggedCalls = flaggedResult.rows[0].flagged_count || 0;
    
    // Get total drug mentions
    const drugMentionsQuery = `
      SELECT SUM(count) AS total_mentions
      FROM drug_mentions
    `;
    const drugMentionsResult = await pool.query(drugMentionsQuery);
    const drugMentions = drugMentionsResult.rows[0].total_mentions || 0;
    
    // Return the metrics
    return NextResponse.json({
      totalCalls: totalCalls.toString(),
      avgSentiment: avgSentiment.toString(),
      flaggedCalls: flaggedCalls.toString(),
      drugMentions: drugMentions.toString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}