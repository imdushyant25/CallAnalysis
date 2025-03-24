// File location: lib/models/callModel.ts
/**
 * Models representing call data and related entities
 */

export interface Call {
    id: string; // UUID
    s3AudioKey: string;
    timestamp: string; // ISO date string
    duration: number; // seconds
    agentId: string; // UUID of the agent
    metadata?: {
      callStartTime?: string; // ISO date string
      callEndTime?: string; // ISO date string
      callDirection?: 'inbound' | 'outbound';
      callerId?: string;
      phoneNumber?: string;
      audioMetadata?: {
        format?: string;
        duration?: number;
        sampleRate?: number;
        channels?: number;
        bitDepth?: number;
      };
    };
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
  }
  
  export interface ProcessingStatus {
    id: string; // UUID
    callId: string; // UUID
    status: ProcessingStatusType;
    transcriptionStatus: StatusType;
    analysisStatus: StatusType;
    errorMessage?: string;
    startedAt: string; // ISO date string
    completedAt?: string; // ISO date string
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
  }
  
  // Status types for the overall processing
  export type ProcessingStatusType = 
    | 'pending'     // Initial state, waiting to start processing
    | 'transcribing' // Currently transcribing the audio
    | 'analyzing'   // Currently analyzing the transcript
    | 'completed'   // All processing completed successfully
    | 'failed';     // Processing failed at some point
  
  // Status types for individual processing stages
  export type StatusType = 
    | 'pending'     // Not yet started
    | 'in_progress' // Currently processing
    | 'completed'   // Completed successfully
    | 'failed';     // Failed during processing
  
  // Request payload for creating a new call record
  export interface CreateCallRequest {
    s3AudioKey: string;
    timestamp?: string;
    duration?: number; 
    agentId?: string;
    metadata?: Record<string, any>;
  }
  
  // Query parameters for fetching calls
  export interface GetCallsParams {
    startDate?: string;
    endDate?: string;
    agentId?: string;
    disposition?: string;
    sentimentMin?: number;
    sentimentMax?: number;
    hasDrugMention?: boolean;
    flagged?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'duration' | 'sentiment';
    sortDirection?: 'asc' | 'desc';
  }
  
  // Response for fetching multiple calls with pagination
  export interface GetCallsResponse {
    calls: Call[];
    total: number;
    page: number;
    totalPages: number;
  }
  
  // Model representing a call flag
  export interface CallFlag {
    id: string;
    callId: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: string;
  }
  
  // Request payload for creating a call flag
  export interface CreateCallFlagRequest {
    callId: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }
  
  // Model representing a call tag
  export interface CallTag {
    id: string;
    callId: string;
    tag: string;
    createdAt: string;
  }