// File location: lib/services/transcriptionService.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { piiMaskingService } from './piiMaskingService';

// Initialize database connection pool
const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export interface TranscriptionSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface TranscriptionResult {
  id: string;
  callId: string;
  fullText: string;
  maskedFullText?: string; // New field for masked text
  segments: TranscriptionSegment[];
  maskedSegments?: TranscriptionSegment[]; // New field for masked segments
  metadata: {
    transcriptionModel: string;
    language: string;
    processingTime: number;
    piiMaskingApplied?: boolean; // Flag to indicate if PII masking was applied
    piiMaskingMetadata?: any; // Metadata from the PII masking process
  };
}

export class TranscriptionService {
  // Whisper API URL and key
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  
  constructor() {
    this.apiKey = process.env.LEMONFOX_API_KEY || '';
    this.apiEndpoint = 'https://api.lemonfox.ai/v1/audio/transcriptions';
    this.modelName = 'lemonfox-ai';
    
    if (!this.apiKey) {
      //logger.error('LEMONFOX_API_KEY environment variable is not set');
      throw new Error('LEMONFOX_API_KEY environment variable is not set');
    }
  }
  
  /**
   * Process a call for transcription using Whisper API
   */
  async processCall(callId: string, audioUrl: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    try {
      // Call LemonFox API with the audio URL directly
      const lemonfoxApiKey = process.env.LEMONFOX_API_KEY || this.apiKey;
      const response = await axios.post(
        "https://api.lemonfox.ai/v1/audio/transcriptions",
        {
          file: audioUrl, // Send the presigned URL directly
          language: "english",
          response_format: "json"
        },
        {
          headers: {
            'Authorization': `Bearer ${lemonfoxApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process the response 
      const fullText = response.data.text;
      const processingTime = Date.now() - startTime;
      
      // Since LemonFox doesn't provide segments, we need to create them
      // Split text into sentences as a simple way to create segments
      const sentences = fullText.split(/(?<=[.!?])\s+/);
      const segments: TranscriptionSegment[] = [];
      
      let currentTime = 0;
      sentences.forEach((sentence: string, index: number) => {
        // Estimate duration based on word count (about 0.5 seconds per word)
        const wordCount = sentence.split(/\s+/).length;
        const duration = Math.max(1, wordCount * 0.5);
        
        segments.push({
          speaker: index % 2 === 0 ? 'Agent' : 'Customer', // alternate speakers
          text: sentence.trim(),
          startTime: currentTime,
          endTime: currentTime + duration,
          confidence: 0.9 // default confidence
        });
        
        currentTime += duration;
      });
      
      // Apply PII masking to the transcript
      const maskedData = await piiMaskingService.maskSegments(segments);
      
      // Create the transcription result
      const transcriptionId = uuidv4();
      const result: TranscriptionResult = {
        id: transcriptionId,
        callId,
        fullText,
        maskedFullText: maskedData.maskedText,
        segments,
        maskedSegments: maskedData.maskedSegments,
        metadata: {
          transcriptionModel: "lemonfox-ai",
          language: "english",
          processingTime,
          piiMaskingApplied: true,
          piiMaskingMetadata: maskedData.maskingMetadata
        }
      };
      
      // Save to database
      await this.saveTranscription(result);
      
      // Update call duration based on our estimated segments
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const duration = Math.ceil(lastSegment.endTime);
        await this.updateCallDuration(callId, duration);
      }
      
      return result;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  
  /**
   * Save transcription to database
   */
  private async saveTranscription(transcription: TranscriptionResult): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      
      // Insert the transcription
      const insertQuery = `
        INSERT INTO transcriptions (
          id, 
          call_id, 
          full_text,
          masked_full_text,
          segments,
          masked_segments,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          full_text = EXCLUDED.full_text,
          masked_full_text = EXCLUDED.masked_full_text,
          segments = EXCLUDED.segments,
          masked_segments = EXCLUDED.masked_segments,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
      
      const values = [
        transcription.id,
        transcription.callId,
        transcription.fullText,
        transcription.maskedFullText || null,
        JSON.stringify(transcription.segments),
        transcription.maskedSegments ? JSON.stringify(transcription.maskedSegments) : null,
        JSON.stringify(transcription.metadata)
      ];
      
      await client.query(insertQuery, values);
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving transcription:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update call duration based on transcription
   */
  private async updateCallDuration(callId: string, duration: number): Promise<void> {
    try {
      const updateQuery = `
        UPDATE calls
        SET duration = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await pool.query(updateQuery, [duration, callId]);
    } catch (error) {
      console.error('Error updating call duration:', error);
      throw error;
    }
  }
  
  /**
   * Get transcription for a call
   */
  async getTranscription(callId: string): Promise<TranscriptionResult | null> {
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
        WHERE call_id = $1
      `;
      
      const result = await pool.query(query, [callId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const transcription = result.rows[0];
      
      // Parse JSON fields
      transcription.segments = typeof transcription.segments === 'string' 
        ? JSON.parse(transcription.segments) 
        : transcription.segments;
      
      if (transcription.maskedSegments) {
        transcription.maskedSegments = typeof transcription.maskedSegments === 'string'
          ? JSON.parse(transcription.maskedSegments)
          : transcription.maskedSegments;
      }
        
      transcription.metadata = typeof transcription.metadata === 'string' 
        ? JSON.parse(transcription.metadata) 
        : transcription.metadata;
      
      return transcription;
    } catch (error) {
      console.error('Error getting transcription:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();