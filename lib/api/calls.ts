// File location: lib/api/calls.ts
/**
 * Enhanced Calls API Client
 * Functions for interacting with call-related API endpoints
 */

export interface Call {
  id: string;
  timestamp: string;
  duration: number;
  agentId: string;
  agentName?: string;
  s3AudioKey: string;
  metadata?: any;
  sentiment?: number;
}

export interface Transcription {
  id: string;
  callId: string;
  fullText: string;
  segments: Array<{
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  metadata?: {
    transcriptionModel: string;
    language: string;
    processingTime: number;
  };
}

export interface Analysis {
  id: string;
  callId: string;
  sentiment: {
    overallScore: number;
    timeline: Array<{
      time: number;
      score: number;
    }>;
    emotionTags: string[];
    escalationPoints: Array<{
      time: number | string;
      text: string;
      reason: string;
    }>;
  };
  clinicalSummary: {
    medicalConditions: string[];
    drugMentions: Array<{
      name: string;
      count: number;
      context: string;
    }>;
    clinicalContext: string;
  };
  agentPerformance: {
    communicationScore: number;
    adherenceToProtocol: number;
    empathyScore: number;
    efficiencyScore: number;
    improvementAreas: string[];
    effectiveTechniques: string[];
  };
  callSummary: string;
  disposition: string;
  followUpRequired: boolean;
  flags: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  tags: string[];
  metadata?: {
    analysisModel: string;
    version: string;
    processingTime: number;
  };
}

export interface CompleteCallData {
  call: Call;
  transcription: Transcription;
  analysis: Analysis;
}

export interface CallsResponse {
  calls: Call[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CallFilters {
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

export interface TrendData {
  date: string;
  value: number;
}

export interface DrugMentionData {
  drug: string;
  count: number;
}

export interface DashboardMetrics {
  totalCalls: string;
  avgSentiment: string;
  flaggedCalls: string;
  drugMentions: string;
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const response = await fetch('/api/dashboard/metrics');
    
    if (!response.ok) {
      throw new Error(`Error fetching dashboard metrics: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    throw error;
  }
}

/**
 * Fetch calls with optional filtering
 */
export async function getCalls(filters?: CallFilters): Promise<CallsResponse> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    // Make API request
    const response = await fetch(`/api/calls?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching calls: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCalls:', error);
    throw error;
  }
}

/**
 * Fetch a single call by ID
 */
export async function getCall(callId: string): Promise<Call> {
  try {
    const response = await fetch(`/api/calls/${callId}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching call: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCall:', error);
    throw error;
  }
}

/**
 * Get transcription for a call
 */
export async function getTranscription(callId: string): Promise<Transcription> {
  try {
    const response = await fetch(`/api/calls/${callId}/transcribe`);
    
    if (!response.ok) {
      throw new Error(`Error fetching transcription: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getTranscription:', error);
    throw error;
  }
}

/**
 * Request transcription for a call
 */
export async function requestTranscription(callId: string): Promise<{ success: boolean; transcription: Transcription }> {
  try {
    const response = await fetch(`/api/calls/${callId}/transcribe`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error requesting transcription: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in requestTranscription:', error);
    throw error;
  }
}

/**
 * Get analysis for a call
 */
export async function getAnalysis(callId: string): Promise<Analysis> {
  try {
    const response = await fetch(`/api/calls/${callId}/analyze`);
    
    if (!response.ok) {
      throw new Error(`Error fetching analysis: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getAnalysis:', error);
    throw error;
  }
}

/**
 * Request analysis for a call
 */
export async function requestAnalysis(callId: string): Promise<{ success: boolean; analysis: Analysis }> {
  try {
    const response = await fetch(`/api/calls/${callId}/analyze`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error requesting analysis: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in requestAnalysis:', error);
    throw error;
  }
}

/**
 * Get complete call data including transcription and analysis
 */
export async function getCallData(callId: string): Promise<CompleteCallData> {
  try {
    const response = await fetch(`/api/calls/${callId}/complete`);
    
    if (!response.ok) {
      throw new Error(`Error fetching call data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCallData:', error);
    throw error;
  }
}

/**
 * Get audio URL for a call
 */
export async function getCallAudioUrl(callId: string): Promise<{ url: string; expiresIn: number }> {
  try {
    const response = await fetch(`/api/calls/${callId}/audio`);
    
    if (!response.ok) {
      throw new Error(`Error fetching audio URL: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCallAudioUrl:', error);
    throw error;
  }
}

/**
 * Flag a call for review
 */
export async function flagCall(callId: string, reason: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`/api/calls/${callId}/flag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, severity }),
    });
    
    if (!response.ok) {
      throw new Error(`Error flagging call: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in flagCall:', error);
    throw error;
  }
}

/**
 * Get sentiment trend data
 */
export async function getSentimentTrend(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<TrendData[]> {
  try {
    const response = await fetch(`/api/dashboard/sentiment-trend?timeframe=${timeframe}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching sentiment trend: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getSentimentTrend:', error);
    throw error;
  }
}

/**
 * Get call volume trend data
 */
export async function getCallVolumeTrend(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<TrendData[]> {
  try {
    const response = await fetch(`/api/dashboard/call-volume?timeframe=${timeframe}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching call volume trend: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCallVolumeTrend:', error);
    throw error;
  }
}

/**
 * Get top drug mentions
 */
export async function getDrugMentions(limit: number = 10): Promise<DrugMentionData[]> {
  try {
    const response = await fetch(`/api/dashboard/drug-mentions?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching drug mentions: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getDrugMentions:', error);
    throw error;
  }
}

/**
 * Get call trends by a specific metric
 */
export async function getCallsTrend(
  metric: 'sentiment' | 'volume' | 'duration',
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<TrendData[]> {
  try {
    const response = await fetch(`/api/calls/trends?metric=${metric}&timeframe=${timeframe}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching calls trend: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getCallsTrend:', error);
    throw error;
  }
}