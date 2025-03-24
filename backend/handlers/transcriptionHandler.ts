/**
 * Transcription Handler
 * Lambda functions for handling audio transcription
 */
import { SNSEvent } from 'aws-lambda';
import { S3Service } from '../services/s3Service';
import { TranscriptionService } from '../services/transcriptionService';
import { DatabaseService } from '../services/databaseService';
import { SNS } from 'aws-sdk';
import { logger } from '../utils/logger';

// Initialize services
const s3Service = new S3Service();
const transcriptionService = new TranscriptionService();
const dbService = new DatabaseService();
const sns = new SNS();

/**
 * Runs the transcription process for an uploaded audio file
 */
export const runTranscription = async (event: SNSEvent): Promise<void> => {
  try {
    // Get message from SNS event
    const message = JSON.parse(event.Records[0].Sns.Message);
    const { callId, bucket, key } = message;
    
    logger.info(`Starting transcription for call ${callId}, file ${key}`);
    
    // Download audio file from S3
    const audioBuffer = await s3Service.getObject(bucket, key);
    
    // Start the transcription process
    const startTime = Date.now();
    const transcriptionResult = await transcriptionService.transcribe(audioBuffer);
    const processingTime = Date.now() - startTime;
    
    // Extract audio duration from transcription result
    const duration = transcriptionResult.segments.length > 0 
      ? transcriptionResult.segments[transcriptionResult.segments.length - 1].endTime 
      : 0;
    
    // Update call record with duration
    await dbService.updateCallDuration(callId, duration);
    
    // Store transcription in database
    const transcriptionId = await dbService.createTranscription({
      callId,
      fullText: transcriptionResult.fullText,
      segments: transcriptionResult.segments,
      metadata: {
        transcriptionModel: transcriptionService.getModelName(),
        language: 'en',
        processingTime,
      }
    });
    
    logger.info(`Transcription completed for call ${callId}, transcription ID: ${transcriptionId}`);
    
    // Publish message to SNS to trigger analysis
    await sns.publish({
      TopicArn: process.env.ANALYSIS_TOPIC_ARN,
      Message: JSON.stringify({ 
        callId,
        transcriptionId 
      }),
    }).promise();
    
    logger.info(`Analysis process triggered for call ${callId}`);
  } catch (error) {
    logger.error('Error running transcription', error);
    throw error;
  }
};