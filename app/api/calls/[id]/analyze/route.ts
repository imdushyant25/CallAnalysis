// File location: app/api/calls/[id]/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { analysisService } from '@/lib/services/analysisService';
import { transcriptionService } from '@/lib/services/transcriptionService';
import { v4 as uuidv4 } from 'uuid'; // Add import for uuidv4

// Initialize database connection
const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * POST handler to analyze a call that has been transcribed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  const startTime = Date.now();
  
  try {
    const callId = params.id;
    
    // Step 1: Get the call details
    const callResult = await client.query(
      `SELECT 
        id, s3_audio_key as "s3AudioKey", timestamp, duration, agent_id as "agentId", metadata 
      FROM calls 
      WHERE id = $1`,
      [callId]
    );
    
    if (callResult.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = callResult.rows[0];
    
    // Parse metadata if it's a string
    if (call.metadata && typeof call.metadata === 'string') {
      call.metadata = JSON.parse(call.metadata);
    }
    
    // Step 2: Get the transcription
    const transcription = await transcriptionService.getTranscription(callId);
    
    if (!transcription) {
      return NextResponse.json({ 
        error: 'Transcription not found. Please transcribe the call first.' 
      }, { status: 404 });
    }
    
    // Step 3: Analyze the transcription
    await client.query('BEGIN');
    
    // Check if analysis already exists
    const existingAnalysisResult = await client.query(
      'SELECT id FROM analysis WHERE call_id = $1',
      [callId]
    );
    
    if (existingAnalysisResult.rows.length > 0) {
      // Delete existing analysis
      await client.query(
        'DELETE FROM analysis WHERE call_id = $1',
        [callId]
      );
      
      // Delete related drug mentions
      await client.query(
        'DELETE FROM drug_mentions WHERE call_id = $1',
        [callId]
      );
      
      // Delete related call flags
      await client.query(
        'DELETE FROM call_flags WHERE call_id = $1',
        [callId]
      );
    }
    
    // Perform analysis
    const analysis = await analysisService.analyzeTranscription(transcription, call);
    
    // Update processing time - handle the case where metadata might be undefined
    if (!analysis.metadata) {
      analysis.metadata = {
        analysisModel: analysisService.getModelName(),
        version: analysisService.getModelVersion(),
        processingTime: 0,
        createdAt: new Date().toISOString()
      };
    }
    analysis.metadata.processingTime = Date.now() - startTime;
    
    // Step 4: Store analysis in database
    const insertAnalysisQuery = `
      INSERT INTO analysis (
        id, call_id, sentiment, clinical_summary, agent_performance, 
        call_summary, disposition, follow_up_required, flags,
        tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const analysisValues = [
      analysis.id,
      callId,
      JSON.stringify(analysis.sentiment),
      JSON.stringify(analysis.clinicalSummary),
      JSON.stringify(analysis.agentPerformance),
      analysis.callSummary,
      analysis.disposition,
      analysis.followUpRequired,
      JSON.stringify(analysis.flags),
      JSON.stringify(analysis.tags),
      JSON.stringify(analysis.metadata)
    ];
    
    await client.query(insertAnalysisQuery, analysisValues);
    
    // Step 5: Store drug mentions
    if (analysis.clinicalSummary.drugMentions.length > 0) {
      const drugInsertQuery = `
        INSERT INTO drug_mentions (
          id, call_id, drug_name, count, context
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      for (const drug of analysis.clinicalSummary.drugMentions) {
        await client.query(drugInsertQuery, [
          uuidv4(),
          callId,
          drug.name,
          drug.count,
          drug.context
        ]);
      }
    }
    
    // Step 6: Store flags if any
    if (analysis.flags.length > 0) {
      const flagInsertQuery = `
        INSERT INTO call_flags (
          id, call_id, type, description, severity
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      for (const flag of analysis.flags) {
        await client.query(flagInsertQuery, [
          uuidv4(),
          callId,
          flag.type,
          flag.description,
          flag.severity
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // Return the analysis
    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      analysis
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error analyzing call:', error);
    
    return NextResponse.json({
      error: 'Failed to analyze call',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * GET handler to retrieve existing analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;
    
    // Query to get analysis with related data
    const query = `
      SELECT 
        a.id, 
        a.call_id as "callId", 
        a.sentiment, 
        a.clinical_summary as "clinicalSummary", 
        a.agent_performance as "agentPerformance",
        a.call_summary as "callSummary", 
        a.disposition, 
        a.follow_up_required as "followUpRequired", 
        a.flags, 
        a.tags,
        a.metadata,
        c.s3_audio_key as "s3AudioKey",
        c.timestamp as "callTimestamp",
        c.duration as "callDuration",
        ag.name as "agentName"
      FROM 
        analysis a
      JOIN 
        calls c ON a.call_id = c.id
      LEFT JOIN
        agents ag ON c.agent_id = ag.id
      WHERE 
        a.call_id = $1
    `;
    
    const result = await pool.query(query, [callId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    const analysis = result.rows[0];
    
    // Parse JSON fields
    ['sentiment', 'clinicalSummary', 'agentPerformance', 'flags', 'tags', 'metadata'].forEach(field => {
      if (analysis[field] && typeof analysis[field] === 'string') {
        analysis[field] = JSON.parse(analysis[field]);
      }
    });
    
    // Get drug mentions
    const drugQuery = `
      SELECT id, drug_name as "drugName", count, context
      FROM drug_mentions
      WHERE call_id = $1
    `;
    
    const drugResult = await pool.query(drugQuery, [callId]);
    analysis.drugMentions = drugResult.rows;
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}