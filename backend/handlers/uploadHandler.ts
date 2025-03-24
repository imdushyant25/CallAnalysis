// File location: backend/handlers/uploadHandler.ts
/**
 * Upload Handler - Database integration
 * Simplified version to store call details
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DatabaseService } from '../services/databaseService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Initialize services
const s3Client = new S3Client({
  region: process.env.CUSTOM_AWS_REGION || 'us-east-1',
});

const dbService = new DatabaseService();

/**
 * Generate pre-signed URL for S3 upload
 */
export async function generateUploadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }
    
    const { filename, fileType } = JSON.parse(event.body);
    
    if (!filename || !fileType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Filename and fileType are required' })
      };
    }
    
    // Validate file type
    if (!fileType.startsWith('audio/')) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Only audio files are allowed' })
      };
    }
    
    // Generate a unique key for the file
    const fileExtension = filename.split('.').pop();
    const key = `uploads/${Date.now()}-${uuidv4().substring(0, 8)}.${fileExtension}`;
    
    // Create the command to put an object in S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    
    // Generate a pre-signed URL that expires in 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    // Return the pre-signed URL and the key
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ uploadUrl, key })
    };
  } catch (error) {
    logger.error('Error generating pre-signed URL', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to generate upload URL' })
    };
  }
}

/**
 * Complete the upload process and create a database record
 */
export async function completeUpload(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }
    
    const { s3Key, metadata } = JSON.parse(event.body);
    
    if (!s3Key) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'S3 key is required' })
      };
    }
    
    // Create a call record in the database
    const callId = await dbService.createCall({
      s3AudioKey: s3Key,
      timestamp: new Date().toISOString(),
      agentId: metadata?.agentId,
      metadata: {
        callDirection: metadata?.callDirection || 'inbound',
        callerId: metadata?.callerId || '',
        callStartTime: metadata?.callStartTime || new Date().toISOString(),
        callEndTime: metadata?.callEndTime || new Date().toISOString(),
        processingStatus: 'pending'
      }
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        id: callId, 
        status: 'success',
        message: 'File uploaded successfully and database record created' 
      })
    };
  } catch (error) {
    logger.error('Error completing upload', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to complete upload process',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}