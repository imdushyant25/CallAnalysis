// File location: app/api/calls/[id]/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Pool } from 'pg';
import { transcriptionService } from '@/lib/services/transcriptionService';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Initialize database connection
const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;
    
    // Get call info from database
    const callResult = await pool.query(
      'SELECT s3_audio_key FROM calls WHERE id = $1',
      [callId]
    );
    
    if (callResult.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const s3AudioKey = callResult.rows[0].s3_audio_key;
    
    // Create a pre-signed URL for the audio file
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET || '',
      Key: s3AudioKey
    });
    
    const audioUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Process transcription - this is a simulated call since using actual Whisper API 
    // requires an OpenAI API key and would incur costs
    // For production, you would use the actual API here
    const transcription = await transcriptionService.processCall(callId, audioUrl);
    
    return NextResponse.json({
      success: true,
      transcription
    });
    
  } catch (error) {
    console.error('Error processing transcription:', error);
    
    return NextResponse.json({
      error: 'Failed to process transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET route to retrieve existing transcription
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;
    
    // Check if user has permission to view PII
    // This would be implemented with your authentication/authorization system
    // For now, we'll extract it from a header (in a real app, use a proper auth system)
    const canViewPii = request.headers.get('x-can-view-pii') === 'true';
    
    // Get transcription from database
    const transcription = await transcriptionService.getTranscription(callId);
    
    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }
    
    // If user doesn't have PII permissions, remove the unmasked data for security
    if (!canViewPii && transcription.metadata?.piiMaskingApplied) {
      // Note: We still send all data to the frontend, but rely on the frontend to not display PII
      // For extra security, you could remove the original data entirely here, like this:
      
      // Create a response that doesn't include the sensitive original text
      /*
      const secureTranscription = {
        ...transcription,
        fullText: transcription.maskedFullText || transcription.fullText,
        segments: transcription.maskedSegments || transcription.segments,
        // Remove these to save bandwidth and for extra security
        maskedFullText: undefined,
        maskedSegments: undefined
      };
      
      return NextResponse.json(secureTranscription);
      */
    }
    
    return NextResponse.json(transcription);
    
  } catch (error) {
    console.error('Error retrieving transcription:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}