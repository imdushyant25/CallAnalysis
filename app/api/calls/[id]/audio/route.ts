// File location: app/api/calls/[id]/audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Pool } from 'pg';

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

export async function GET(
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
    
    // Create a URL that expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600
    });
    
  } catch (error) {
    console.error('Error generating audio URL:', error);
    
    return NextResponse.json({
      error: 'Failed to generate audio URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}