/**
 * Call Types
 * Type definitions for call data, transcriptions, and analysis
 */

// Base Call record
export interface Call {
    id: string;
    timestamp: string;
    duration: number;
    agentId: string;
    s3AudioKey: string;
    metadata?: {
      callStartTime: string;
      callEndTime: string;
      phoneNumber?: string;
      callDirection?: 'inbound' | 'outbound';
      callerId?: string;
    };
  }
  
  // Transcription segments
  export interface TranscriptionSegment {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }
  
  // Full transcription
  export interface Transcription {
    id: string;
    callId: string;
    fullText: string;
    maskedFullText?: string; // Add this
    segments: TranscriptionSegment[];
    maskedSegments?: TranscriptionSegment[]; // Add this
    metadata?: {
      transcriptionModel: string;
      language: string;
      processingTime: number;
      piiMaskingApplied?: boolean; // Add this
      piiMaskingMetadata?: any; // Add this
    };
  }
  
  // Sentiment data
  export interface SentimentData {
    overallScore: number; // 0-100
    timeline: {
      time: number;
      score: number;
    }[];
    emotionTags: string[];
    escalationPoints: {
      time: number;
      text: string;
      reason: string;
    }[];
  }
  
  // Clinical summary
  export interface ClinicalSummary {
    medicalConditions: string[];
    drugMentions: {
      name: string;
      count: number;
      context: string;
    }[];
    clinicalContext: string;
  }
  
  // Agent performance metrics
  export interface AgentPerformance {
    communicationScore: number; // 0-100
    adherenceToProtocol: number; // 0-100
    empathyScore: number; // 0-100
    efficiencyScore: number; // 0-100
    improvementAreas: string[];
    effectiveTechniques: string[];
  }
  
  // Complete call analysis
  export interface Analysis {
    id: string;
    callId: string;
    sentiment: SentimentData;
    clinicalSummary: ClinicalSummary;
    agentPerformance: AgentPerformance;
    callSummary: string;
    disposition: string;
    followUpRequired: boolean;
    flags: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }[];
    tags: string[];
    metadata?: {
      analysisModel: string;
      version: string;
      processingTime: number;
    };
  }
  
  // Complete call data with transcription and analysis
  export interface CompleteCallData {
    call: Call;
    transcription: Transcription;
    analysis: Analysis;
  }