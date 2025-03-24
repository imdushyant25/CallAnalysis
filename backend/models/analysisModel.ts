/**
 * Analysis Models
 * Type definitions for call analysis data
 */

export interface SentimentData {
    overallScore: number;
    timeline: {
      time: number;
      score: number;
    }[];
    emotionTags: string[];
    escalationPoints: {
      time: number | string;
      text: string;
      reason: string;
    }[];
  }
  
  export interface ClinicalSummary {
    medicalConditions: string[];
    drugMentions: {
      name: string;
      count: number;
      context: string;
    }[];
    clinicalContext: string;
  }
  
  export interface AgentPerformance {
    communicationScore: number;
    adherenceToProtocol: number;
    empathyScore: number;
    efficiencyScore: number;
    improvementAreas: string[];
    effectiveTechniques: string[];
  }
  
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
      createdAt?: string;
    };
  }