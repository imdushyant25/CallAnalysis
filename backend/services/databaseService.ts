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