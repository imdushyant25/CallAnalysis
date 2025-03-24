// File location: backend/services/databaseService.ts
/**
 * Database Service
 * Handles interactions with PostgreSQL database - Simplified version
 */
import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Simple type definitions to get started
export interface Call {
  id: string;
  s3AudioKey: string;
  timestamp: string;
  duration: number;
  agentId: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallRequest {
  s3AudioKey: string;
  timestamp?: string;
  duration?: number;
  agentId?: string;
  metadata?: any;
}

export interface GetCallsParams {
  page?: number;
  limit?: number;
}

export class DatabaseService {
  private pool: Pool;
  
  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || '5432'),
      database: process.env.RDS_DATABASE,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      ssl: process.env.NODE_ENV === 'production',
    });
    
    // Log connection issues
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', err);
    });
    
    logger.info('Database connection pool initialized');
  }
  
/**
 * Update call duration based on transcription
 * @param callId The ID of the call to update
 * @param duration The duration in seconds
 */
async updateCallDuration(callId: string, duration: number): Promise<void> {
  try {
    const query = `
      UPDATE calls
      SET duration = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await this.pool.query(query, [duration, callId]);
  } catch (error) {
    console.error('Error updating call duration:', error);
    throw error;
  }
}

/**
 * Create a new transcription record in the database
 * @param transcription The transcription data to store
 * @returns The ID of the created transcription
 */
async createTranscription(transcription: any): Promise<string> {
  try {
    const query = `
      INSERT INTO transcriptions (
        id,
        call_id,
        full_text,
        masked_full_text,
        segments,
        masked_segments,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    // Generate UUID if not provided
    const transcriptionId = transcription.id || uuidv4();
    
    const values = [
      transcriptionId,
      transcription.callId,
      transcription.fullText,
      transcription.maskedFullText || null,
      JSON.stringify(transcription.segments),
      transcription.maskedSegments ? JSON.stringify(transcription.maskedSegments) : null,
      JSON.stringify(transcription.metadata || {})
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0].id || transcriptionId;
  } catch (error) {
    console.error('Error creating transcription:', error);
    throw error;
  }
}

  /**
   * Create a new call record in the database
   */
  async createCall(call: CreateCallRequest): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const callId = uuidv4();
      
      const insertQuery = `
        INSERT INTO calls (
          id, 
          s3_audio_key, 
          timestamp, 
          duration, 
          agent_id, 
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const values = [
        callId,
        call.s3AudioKey,
        call.timestamp || new Date().toISOString(),
        call.duration || 0,
        call.agentId || null,
        JSON.stringify(call.metadata || {})
      ];
      
      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      logger.info(`Created call record with ID: ${result.rows[0].id}`);
      return result.rows[0].id;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating call record', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
/**
 * Create a new analysis record in the database
 */
async createAnalysis(analysis: any): Promise<string> {
  try {
    const query = `
      INSERT INTO analysis (
        id,
        call_id,
        sentiment,
        clinical_summary,
        agent_performance,
        call_summary,
        disposition,
        follow_up_required,
        flags,
        tags,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const values = [
      analysis.id,
      analysis.callId,
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
    
    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating analysis:', error);
    throw error;
  }
}

/**
 * Create a new drug mention record in the database
 */
async createDrugMention(drugMention: any): Promise<string> {
  try {
    const query = `
      INSERT INTO drug_mentions (
        id,
        call_id,
        drug_name,
        count,
        context
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const values = [
      drugMention.id || uuidv4(), // Make sure uuidv4 is imported at the top
      drugMention.callId,
      drugMention.drugName,
      drugMention.count,
      drugMention.context
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating drug mention:', error);
    throw error;
  }
}

/**
 * Create a new call flag in the database
 */
async createCallFlag(flag: any): Promise<string> {
  try {
    const query = `
      INSERT INTO call_flags (
        id,
        call_id,
        type,
        description,
        severity
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const values = [
      flag.id || uuidv4(),
      flag.callId,
      flag.type,
      flag.description,
      flag.severity
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating call flag:', error);
    throw error;
  }
}

  async getTranscription(transcriptionId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          id, 
          call_id as "callId", 
          full_text as "fullText",
          masked_full_text as "maskedFullText",
          segments,
          masked_segments as "maskedSegments",
          metadata
        FROM transcriptions
        WHERE id = $1
      `;
      
      const result = await this.pool.query(query, [transcriptionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const transcription = result.rows[0];
      
      // Parse JSON fields
      if (typeof transcription.segments === 'string') {
        transcription.segments = JSON.parse(transcription.segments);
      }
      
      if (transcription.maskedSegments && typeof transcription.maskedSegments === 'string') {
        transcription.maskedSegments = JSON.parse(transcription.maskedSegments);
      }
      
      if (typeof transcription.metadata === 'string') {
        transcription.metadata = JSON.parse(transcription.metadata);
      }
      
      return transcription;
    } catch (error) {
      console.error('Error getting transcription:', error);
      throw error;
    }
  }

  /**
   * Get a call record by ID
   */
  async getCall(callId: string): Promise<Call | null> {
    try {
      const query = `
        SELECT 
          id, 
          s3_audio_key AS "s3AudioKey", 
          timestamp, 
          duration, 
          agent_id AS "agentId", 
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM calls
        WHERE id = $1
      `;
      
      const result = await this.pool.query(query, [callId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Parse metadata JSON
      const call = result.rows[0];
      if (call.metadata) {
        call.metadata = typeof call.metadata === 'string' 
          ? JSON.parse(call.metadata) 
          : call.metadata;
      }
      
      return call;
    } catch (error) {
      logger.error(`Error getting call ${callId}`, error);
      throw error;
    }
  }

  /**
   * Get calls with pagination
   */
  async getCalls(
    params: GetCallsParams = {}
  ): Promise<{ calls: Call[]; total: number; page: number; totalPages: number }> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      
      // Get total count
      const countQuery = 'SELECT COUNT(*) AS total FROM calls';
      const countResult = await this.pool.query(countQuery);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);
      
      // Get call data
      const dataQuery = `
        SELECT 
          id, 
          s3_audio_key AS "s3AudioKey", 
          timestamp, 
          duration, 
          agent_id AS "agentId", 
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM calls
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2
      `;
      
      const dataResult = await this.pool.query(dataQuery, [limit, offset]);
      
      // Parse metadata for each row
      const calls = dataResult.rows.map(call => {
        if (call.metadata) {
          call.metadata = typeof call.metadata === 'string' 
            ? JSON.parse(call.metadata) 
            : call.metadata;
        }
        return call;
      });
      
      return {
        calls,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error getting calls', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}