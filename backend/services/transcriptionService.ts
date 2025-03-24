/**
 * Transcription Service
 * Handles audio transcription using Whisper API
 */
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { TranscriptionSegment } from '../models/transcriptionModel';
import { logger } from '../utils/logger';

interface WhisperResponse {
  text: string;
  segments: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }[];
  language: string;
}

export class TranscriptionService {
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  
  constructor() {
    this.apiKey = process.env.WHISPER_API_KEY || '';
    this.apiEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
    this.modelName = 'whisper-1';
    
    if (!this.apiKey) {
      logger.error('WHISPER_API_KEY environment variable is not set');
      throw new Error('WHISPER_API_KEY environment variable is not set');
    }
  }
  
  /**
   * Transcribe audio buffer using Whisper API
   */
  async transcribe(audioBuffer: Buffer): Promise<{ fullText: string; segments: TranscriptionSegment[] }> {
    try {
      // Prepare form data
      const formData = new FormData();
      
      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(audioBuffer);
      stream.push(null);
      
      // Add file to form data
      formData.append('file', stream, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      
      // Add model and response format parameters
      formData.append('model', this.modelName);
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'en');
      formData.append('temperature', '0.2');
      formData.append('diarize', 'true'); // Enable speaker diarization if supported
      
      // Make API request
      const response = await axios.post<WhisperResponse>(this.apiEndpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // Process response
      const { text, segments } = response.data;
      
      // Convert Whisper segments to our format
      const processedSegments: TranscriptionSegment[] = segments.map(segment => {
        // Determine speaker (placeholder - would be replaced with actual diarization logic)
        // For placeholder, alternate between "Agent" and "Customer"
        const speaker = segment.id % 2 === 0 ? 'Agent' : 'Customer';
        
        return {
          speaker,
          text: segment.text.trim(),
          startTime: segment.start,
          endTime: segment.end,
          confidence: Math.exp(segment.avg_logprob), // Convert log probability to confidence score
        };
      });
      
      return {
        fullText: text,
        segments: processedSegments,
      };
    } catch (error) {
      logger.error('Error transcribing audio', error);
      throw error;
    }
  }
  
  /**
   * Get the name of the transcription model
   */
  getModelName(): string {
    return this.modelName;
  }
}