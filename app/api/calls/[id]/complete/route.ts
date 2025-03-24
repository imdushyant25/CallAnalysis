/**
 * API Route: GET /api/calls/[id]/complete
 * Fetches complete call data including call details, transcription, and analysis
 */
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
  const client = await pool.connect();
  
  try {
    const callId = params.id;
    
    // Step 1: Get call details
    const callQuery = `
      SELECT 
        c.id, 
        c.s3_audio_key as "s3AudioKey", 
        c.timestamp, 
        c.duration, 
        c.agent_id as "agentId",
        c.metadata,
        a.name as "agentName"
      FROM 
        calls c
      LEFT JOIN 
        agents a ON c.agent_id = a.id
      WHERE 
        c.id = $1
    `;
    
    const callResult = await client.query(callQuery, [callId]);
    
    if (callResult.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = callResult.rows[0];
    
    // Parse metadata if needed
    if (call.metadata && typeof call.metadata === 'string') {
      call.metadata = JSON.parse(call.metadata);
    }
    
    // Step 2: Get transcription
    const transcriptionQuery = `
      SELECT 
        id, 
        call_id as "callId", 
        full_text as "fullText", 
        masked_full_text as "maskedFullText",
        segments,
        masked_segments as "maskedSegments",
        metadata
      FROM 
        transcriptions
      WHERE 
        call_id = $1
    `;
    
    const transcriptionResult = await client.query(transcriptionQuery, [callId]);
    const transcription = transcriptionResult.rows[0] || null;
    
    // Parse JSON fields in transcription
    if (transcription) {
      if (transcription.segments && typeof transcription.segments === 'string') {
        transcription.segments = JSON.parse(transcription.segments);
      }
      
      if (transcription.maskedSegments && typeof transcription.maskedSegments === 'string') {
        transcription.maskedSegments = JSON.parse(transcription.maskedSegments);
      }
      
      if (transcription.metadata && typeof transcription.metadata === 'string') {
        transcription.metadata = JSON.parse(transcription.metadata);
      }
    }
    
    // Step 3: Get analysis
    const analysisQuery = `
      SELECT 
        id, 
        call_id as "callId", 
        sentiment,
        clinical_summary as "clinicalSummary",
        agent_performance as "agentPerformance",
        call_summary as "callSummary",
        disposition,
        follow_up_required as "followUpRequired",
        flags,
        tags,
        metadata
      FROM 
        analysis
      WHERE 
        call_id = $1
    `;
    
    const analysisResult = await client.query(analysisQuery, [callId]);
    const analysis = analysisResult.rows[0] || null;
    
    // Parse JSON fields in analysis
    if (analysis) {
      ['sentiment', 'clinicalSummary', 'agentPerformance', 'flags', 'tags'].forEach(field => {
        if (analysis[field] && typeof analysis[field] === 'string') {
          analysis[field] = JSON.parse(analysis[field]);
        }
      });
      
      if (analysis.metadata && typeof analysis.metadata === 'string') {
        analysis.metadata = JSON.parse(analysis.metadata);
      }
      
      // Get drug mentions
      const drugQuery = `
        SELECT 
          id, 
          drug_name as "drugName", 
          count, 
          context
        FROM 
          drug_mentions
        WHERE 
          call_id = $1
      `;
      
      const drugResult = await client.query(drugQuery, [callId]);
      analysis.drugMentions = drugResult.rows;
    }
    
    // Combine all data into response
    const completeCallData = {
      call,
      transcription,
      analysis
    };
    
    return NextResponse.json(completeCallData);
    
  } catch (error) {
    console.error('Error fetching complete call data:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch complete call data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}