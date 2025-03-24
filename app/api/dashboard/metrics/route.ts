// File location: app/api/dashboard/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get total call count
    const callCountQuery = 'SELECT COUNT(*) FROM calls';
    const callCountResult = await query(callCountQuery);
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
    const sentimentResult = await query(sentimentQuery);
    const avgSentiment = sentimentResult.rows[0].avg_sentiment 
      ? parseFloat(sentimentResult.rows[0].avg_sentiment).toFixed(1) 
      : '0';
    
    // Get flagged calls count
    const flaggedQuery = `
      SELECT COUNT(DISTINCT call_id) AS flagged_count
      FROM call_flags
    `;
    const flaggedResult = await query(flaggedQuery);
    const flaggedCalls = flaggedResult.rows[0].flagged_count || 0;
    
    // Get total drug mentions
    const drugMentionsQuery = `
      SELECT SUM(count) AS total_mentions
      FROM drug_mentions
    `;
    const drugMentionsResult = await query(drugMentionsQuery);
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