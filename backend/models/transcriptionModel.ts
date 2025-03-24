/**
 * Transcription Models
 * Type definitions for transcription data
 */

export interface TranscriptionSegment {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }
  
  export interface Transcription {
    id: string;
    callId: string;
    fullText: string;
    maskedFullText?: string;
    segments: TranscriptionSegment[];
    maskedSegments?: TranscriptionSegment[];
    metadata: {
      transcriptionModel: string;
      language: string;
      processingTime: number;
      piiMaskingApplied?: boolean;
      piiMaskingMetadata?: any;
    };
  }