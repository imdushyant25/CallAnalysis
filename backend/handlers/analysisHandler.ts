/**
 * Analysis Handler
 * Lambda functions for handling call analysis using Claude API
 */
import { SNSEvent } from 'aws-lambda';
import { DatabaseService } from '../services/databaseService';
import { AnalysisService } from '../services/analysisService';
import { logger } from '../utils/logger';

// Initialize services
const dbService = new DatabaseService();
const analysisService = new AnalysisService();

/**
 * Runs the analysis process for a transcribed call
 */
export const runAnalysis = async (event: SNSEvent): Promise<void> => {
  try {
    // Get message from SNS event
    const message = JSON.parse(event.Records[0].Sns.Message);
    const { callId, transcriptionId } = message;
    
    logger.info(`Starting analysis for call ${callId}, transcription ${transcriptionId}`);
    
    // Get transcription data from database
    const transcription = await dbService.getTranscription(transcriptionId);
    
    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }
    
    // Get call data from database
    const call = await dbService.getCall(callId);
    
    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }
    
    // Start the analysis process
    const startTime = Date.now();
    const analysisResult = await analysisService.analyze(transcription, call);
    const processingTime = Date.now() - startTime;
    
    // Store analysis in database
    const analysisId = await dbService.createAnalysis({
      ...analysisResult,
      callId,
      metadata: {
        analysisModel: analysisService.getModelName(),
        version: analysisService.getModelVersion(),
        processingTime,
      }
    });
    
    logger.info(`Analysis completed for call ${callId}, analysis ID: ${analysisId}`);
    
    // Process and store drug mentions if any
    if (analysisResult.clinicalSummary && analysisResult.clinicalSummary.drugMentions.length > 0) {
      await Promise.all(
        analysisResult.clinicalSummary.drugMentions.map(drug => 
          dbService.createDrugMention({
            callId,
            drugName: drug.name,
            count: drug.count,
            context: drug.context
          })
        )
      );
      
      logger.info(`Stored ${analysisResult.clinicalSummary.drugMentions.length} drug mentions for call ${callId}`);
    }
    
    // Process and store flags if any
    if (analysisResult.flags && analysisResult.flags.length > 0) {
      await Promise.all(
        analysisResult.flags.map(flag => 
          dbService.createCallFlag({
            callId,
            type: flag.type,
            description: flag.description,
            severity: flag.severity
          })
        )
      );
      
      logger.info(`Stored ${analysisResult.flags.length} flags for call ${callId}`);
    }
  } catch (error) {
    logger.error('Error running analysis', error);
    throw error;
  }
};