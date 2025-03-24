// File location: lib/types/analysis.ts
/**
 * Analysis Types
 * Type definitions for call analysis data
 */

// Sentiment data
export interface SentimentData {
  overallScore: number; // 0-100
  timeline: {
    time: number;
    score: number;
  }[];
  emotionTags: string[];
  escalationPoints: Array<{
    time: number | string; // Could be a number of seconds or "unknown"
    text: string;
    reason: string;
  }>;
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
      createdAt: string;
    };
    drugMentions?: {
      id: string;
      drugName: string;
      count: number;
      context: string;
    }[];
  }