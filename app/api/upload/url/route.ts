/**
 * File location: app/api/upload/url/route.ts
 * API route for generating pre-signed URLs for S3 uploads
 */
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.CUSTOM_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { filename, fileType } = body;
    
    if (!filename || !fileType) {
      return NextResponse.json({ error: 'Filename and fileType are required' }, { status: 400 });
    }
    
    // Validate file type
    if (!fileType.startsWith('audio/')) {
      return NextResponse.json({ error: 'Only audio files are allowed' }, { status: 400 });
    }
    
    // Generate a unique key for the file
    const fileExtension = filename.split('.').pop();
    const key = `${process.env.NEXT_PUBLIC_S3_PREFIX || 'uploads'}/${Date.now()}-${uuidv4().substring(0, 8)}.${fileExtension}`;
    
    // Create the command to put an object in S3
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    
    // Generate a pre-signed URL that expires in 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    // Return the pre-signed URL and the key
    return NextResponse.json({ uploadUrl, key });
    
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}