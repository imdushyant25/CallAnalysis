// File location: backend/handlers/queryHandler.ts
/**
 * Query Handler
 * Lambda functions for handling data queries - Simplified version
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

// Initialize service
const dbService = new DatabaseService();

/**
 * Get calls with pagination
 */
export const getCalls = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams = event.queryStringParameters || {};
    
    // Parse pagination params
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '20');
    
    const result = await dbService.getCalls({ page, limit });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Error getting calls', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to get calls' })
    };
  }
};

/**
 * Get a single call by ID
 */
export const getCall = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const callId = event.pathParameters?.id;
    
    if (!callId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Call ID is required' })
      };
    }
    
    const call = await dbService.getCall(callId);
    
    if (!call) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Call not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(call)
    };
  } catch (error) {
    logger.error('Error getting call', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to get call' })
    };
  }
};