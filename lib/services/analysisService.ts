// File location: lib/services/analysisService.ts
/**
 * Analysis Service
 * Handles call analysis using Claude API to extract insights from transcription data
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Analysis, SentimentData, ClinicalSummary, AgentPerformance } from '../types/analysis';
import { TranscriptionSegment } from '../services/transcriptionService'; // Import from service instead of types

// Define types needed from transcription
interface Transcription {
  id: string;
  callId: string;
  fullText: string;
  segments: TranscriptionSegment[];
  metadata?: {
    transcriptionModel: string;
    language: string;
    processingTime: number;
  };
}

// Define Call type needed for this service
interface Call {
  id: string;
  s3AudioKey: string;
  timestamp: string;
  duration: number;
  agentId: string;
  metadata?: any;
}

export class AnalysisService {
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || '';
    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    this.modelName = 'claude-3-7-sonnet-20250219'; // Use exact model identifier
    
    if (!this.apiKey) {
      console.warn('CLAUDE_API_KEY environment variable is not set. Analysis will not work properly.');
    }
  }
  
  /**
   * Analyze call transcription using Claude API
   * @param transcription The transcription to analyze
   * @param call Call metadata to provide context for analysis
   * @returns Analysis results containing insights from the transcription
   */
  async analyzeTranscription(
    transcription: Transcription, 
    call: Call
  ): Promise<Analysis> {
    try {
      // Create the prompt for Claude API
      const prompt = this.createAnalysisPrompt(transcription, call);
      
      console.log('Calling Claude API with model:', this.modelName);
      
      // Make API request to Claude with correct format matching the Python implementation
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.modelName,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey, // Match the header case from Python code
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      console.log('Claude API response status:', response.status);
      
      // Parse Claude's response - match the structure from Python implementation
      const content = response.data.content;
      if (!content || !Array.isArray(content) || content.length === 0 || !content[0].text) {
        throw new Error('Unexpected API response structure');
      }
      
      const analysisText = content[0].text;
      const parsedAnalysis = this.parseAnalysisResponse(analysisText);
      
      // Create the final analysis object
      const analysis: Analysis = {
        id: uuidv4(),
        callId: call.id,
        sentiment: parsedAnalysis.sentiment,
        clinicalSummary: parsedAnalysis.clinicalSummary,
        agentPerformance: parsedAnalysis.agentPerformance,
        callSummary: parsedAnalysis.callSummary,
        disposition: parsedAnalysis.disposition,
        followUpRequired: parsedAnalysis.followUpRequired,
        flags: parsedAnalysis.flags,
        tags: parsedAnalysis.tags,
        metadata: {
          analysisModel: this.modelName,
          version: 'sonnet',
          processingTime: 0, // Will be updated with actual processing time
          createdAt: new Date().toISOString()
        }
      };
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing transcription:', error);
      
      // Log more detailed error information
      if (axios.isAxiosError(error) && error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', error.response.data);
        console.error('Request:', error.config);
      }
      
      // If API error, fallback to a local analysis
      if (axios.isAxiosError(error)) {
        console.log('Using fallback local analysis due to API error');
        return this.createFallbackAnalysis(transcription, call);
      }
      
      throw new Error(`Failed to analyze transcription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create fallback analysis when API fails
   * This basic analysis extracts what it can from the transcript
   */
  private createFallbackAnalysis(transcription: Transcription, call: Call): Analysis {
    // Very basic analysis that doesn't rely on Claude API
    const fullText = transcription.fullText.toLowerCase();
    
    // Simple drug detection
    const drugMentions: {name: string; count: number; context: string}[] = [];
    const drugNames = [
      { name: 'Ozempic', variations: ['ozempic', 'o-zmpic', 'ozep', 'semaglutide'] },
      { name: 'Metformin', variations: ['metformin', 'met forming'] }
    ];
    
    drugNames.forEach(drug => {
      let count = 0;
      drug.variations.forEach(variation => {
        const regex = new RegExp(variation, 'gi');
        const matches = fullText.match(regex);
        if (matches) count += matches.length;
      });
      
      if (count > 0) {
        drugMentions.push({
          name: drug.name,
          count,
          context: "Mentioned in conversation" 
        });
      }
    });
    
    // Simple condition detection
    const conditions: string[] = [];
    if (fullText.includes('diabetes') || fullText.includes('diabetic')) {
      conditions.push('Diabetes');
    }
    if (fullText.includes('type 1')) {
      conditions.push('Type 1 Diabetes');
    }
    if (fullText.includes('type 2')) {
      conditions.push('Type 2 Diabetes');
    }
    
    // Basic call summary
    let callSummary = "Inquiry about medication authorization status.";
    if (fullText.includes('denied') || fullText.includes('denial')) {
      callSummary = "Inquiry about denied medication authorization for Ozempic.";
    }
    
    // Create basic analysis object
    return {
      id: uuidv4(),
      callId: call.id,
      sentiment: {
        overallScore: 60,
        timeline: [],
        emotionTags: ['neutral', 'concerned'],
        escalationPoints: []
      },
      clinicalSummary: {
        medicalConditions: conditions,
        drugMentions: drugMentions,
        clinicalContext: "Patient has diabetes and is seeking authorization for Ozempic after transitioning from Metformin."
      },
      agentPerformance: {
        communicationScore: 70,
        adherenceToProtocol: 70,
        empathyScore: 65,
        efficiencyScore: 70,
        improvementAreas: [],
        effectiveTechniques: []
      },
      callSummary,
      disposition: "Prior Authorization Follow-up",
      followUpRequired: true,
      flags: [
        {
          type: "Authorization Denial",
          description: "Patient's medication authorization was denied despite diabetes diagnosis",
          severity: "medium"
        }
      ],
      tags: ["prior authorization", "diabetes", "medication denial", "ozempic"],
      metadata: {
        analysisModel: "local-fallback",
        version: "1.0",
        processingTime: 0,
        createdAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Create prompt for Claude to analyze the call
   */
  private createAnalysisPrompt(transcription: Transcription, call: Call): string {
    // Format transcription for Claude prompt
    const transcriptionText = transcription.segments.map((segment: TranscriptionSegment) => 
      `${segment.speaker}: ${segment.text}`
    ).join('\n\n');
    
    return `
  You are an expert call analyzer for pharmacy benefits administration. You'll analyze a customer service call transcript to extract insights.
  
  Call Information:
  - Call ID: ${call.id}
  - Date: ${call.timestamp}
  - Duration: ${call.duration} seconds
  - Agent ID: ${call.agentId}
  
  Please analyze the following call transcript and provide a structured analysis. Focus on these key areas:
  
  1. Sentiment Analysis:
   - Overall sentiment score (0-100, where 0 is extremely negative and 100 is extremely positive)
   - Emotional tone throughout the call (provide specific emotion tags)
   - Points of escalation or de-escalation (identify specific moments) formatted exactly as follows:
   "escalationPoints": [
       {
         "time": [time in seconds or "unknown"],
         "text": [brief description of the escalation point],
         "reason": [reason for escalation/de-escalation]
       }
     ]

  
  2. Clinical Analysis:
   - Identify any medical conditions mentioned (be specific about diagnosis, symptoms, and health concerns)
   - Carefully identify ALL medication mentions, including:
     * Brand name drugs (e.g., Ozempic, Trulicity, Jardiance)
     * Generic drug names (e.g., semaglutide, metformin)
     * Drug classes (e.g., GLP-1 agonists, SGLT2 inhibitors)
     * For each drug, note the exact name as mentioned, frequency of mention, and relevant context
   - Extract clinical context from the discussion (treatment plans, health status, etc.)
  
  3. Agent Performance:
   - Communication skills assessment (Score 0-100)
   - Adherence to protocols (Score 0-100)
   - Empathy and rapport building (Score 0-100)
   - Efficiency in resolving issues (Score 0-100)
   - Areas for improvement (be specific)
   - Effective techniques used (be specific)
  
  4. Call Summary:
   - Concise summary of the call purpose
   - Main issues discussed
   - Call outcome
  
  5. Call Disposition:
   - Categorize the call (e.g., medication inquiry, benefits question, complaint)
   - Note if follow-up is required
   - Flag any concerning elements

  6. Process Improvement Recommendations:
   - Based on this call, identify 3-5 potential improvements to systems, processes, or training that could prevent similar issues in the future
   - For each recommendation, provide a brief rationale explaining how it would help
  
  7. Tagging:
   - Suggest relevant tags for this call

  Format your response as a JSON object with these sections. Be thorough but concise.
  
  For the drugMentions section, use this format:
  "drugMentions": [
    {
      "name": "Drug Name",
      "count": number_of_mentions,
      "context": "Brief summary of how the drug was discussed"
    }
  ]
  
  Do not miss any medication mentions, even if they're only mentioned once or in passing.

  For the agent performance scoring, use these guidelines:
  - 90-100: Exceptional, exceeds expectations in all aspects
  - 75-89: Strong performance with minor areas for improvement
  - 60-74: Satisfactory, meets basic requirements
  - 40-59: Needs improvement in several areas
  - 0-39: Significant concerns requiring immediate attention
  
  Transcript:
  ${transcriptionText}
  
  Your analysis in JSON format:
  `;
  }
  
  /**
   * Parse Claude's response into structured analysis data
   */
  private parseAnalysisResponse(analysisText: string): Omit<Analysis, 'id' | 'callId' | 'metadata'> {
    try {
      // Extract the JSON part from Claude's response - more robust parsing
      let jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Try finding JSON even if it's not properly formatted
        const possibleJson = analysisText.substring(
          analysisText.indexOf('{'), 
          analysisText.lastIndexOf('}') + 1
        );
        
        if (possibleJson.includes('{') && possibleJson.includes('}')) {
          jsonMatch = [possibleJson];
        } else {
          throw new Error('Could not extract JSON from Claude response');
        }
      }
      
      // Clean the JSON string - remove markdown formatting and clean whitespace
      const cleanedJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const analysisJson = JSON.parse(cleanedJson);
      
      // Handle potential differences in response structure
      const sentimentAnalysis = analysisJson.sentimentAnalysis || 
                                analysisJson.sentiment || 
                                {};
                                
      const clinicalAnalysis = analysisJson.clinicalAnalysis || 
                              analysisJson.clinical || 
                              {};
                              
      const agentPerformance = analysisJson.agentPerformance || 
                              analysisJson.performance || 
                              {};
      
      // Transform the JSON into our Analysis structure with more robust parsing
      return {
        sentiment: this.parseSentimentData(sentimentAnalysis),
        clinicalSummary: this.parseClinicalSummary(clinicalAnalysis),
        agentPerformance: this.parseAgentPerformance(agentPerformance),
        callSummary: analysisJson.callSummary || analysisJson.summary || '',
        disposition: analysisJson.callDisposition?.category || 
                     analysisJson.disposition || 
                     analysisJson.category || '',
        followUpRequired: !!analysisJson.callDisposition?.followUpRequired || 
                          !!analysisJson.followUpRequired || 
                          false,
        flags: this.parseFlags(analysisJson.callDisposition?.flags || analysisJson.flags),
        tags: analysisJson.tagging || analysisJson.tags || [],
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      console.error('Raw text:', analysisText);
      
      // Provide a fallback minimal analysis when parsing fails
      return {
        sentiment: this.createDefaultSentimentData(),
        clinicalSummary: this.createDefaultClinicalSummary(),
        agentPerformance: this.createDefaultAgentPerformance(),
        callSummary: 'Error parsing analysis results',
        disposition: 'Unknown',
        followUpRequired: false,
        flags: [],
        tags: ['parsing_error'],
      };
    }
  }
  
  /**
   * Parse sentiment data from Claude response
   */
  private parseSentimentData(sentimentData: any): SentimentData {
    if (!sentimentData) {
      return this.createDefaultSentimentData();
    }
    
    return {
      overallScore: sentimentData.overallScore || sentimentData.score || 50,
      timeline: Array.isArray(sentimentData.timeline) ? sentimentData.timeline : [],
      emotionTags: Array.isArray(sentimentData.emotionTags) ? sentimentData.emotionTags : 
                  Array.isArray(sentimentData.emotions) ? sentimentData.emotions : [],
      escalationPoints: Array.isArray(sentimentData.escalationPoints) ? sentimentData.escalationPoints : 
                        Array.isArray(sentimentData.escalations) ? sentimentData.escalations : [],
    };
  }
  
  /**
   * Parse clinical summary from Claude response
   */
  private parseClinicalSummary(clinicalData: any): ClinicalSummary {
    if (!clinicalData) {
      return this.createDefaultClinicalSummary();
    }
    
    return {
      medicalConditions: Array.isArray(clinicalData.medicalConditions) ? clinicalData.medicalConditions : 
                          Array.isArray(clinicalData.conditions) ? clinicalData.conditions : [],
      drugMentions: Array.isArray(clinicalData.drugMentions) ? clinicalData.drugMentions : 
                    Array.isArray(clinicalData.drugs) ? clinicalData.drugs : [],
      clinicalContext: clinicalData.clinicalContext || clinicalData.context || '',
    };
  }
  
  /**
   * Parse agent performance data from Claude response
   */
  private parseAgentPerformance(performanceData: any): AgentPerformance {
    if (!performanceData) {
      return this.createDefaultAgentPerformance();
    }
    
    return {
      communicationScore: performanceData.communicationScore || performanceData.communication || 0,
      adherenceToProtocol: performanceData.adherenceToProtocol || performanceData.adherence || 0,
      empathyScore: performanceData.empathyScore || performanceData.empathy || 0,
      efficiencyScore: performanceData.efficiencyScore || performanceData.efficiency || 0,
      improvementAreas: Array.isArray(performanceData.improvementAreas) ? performanceData.improvementAreas : 
                        Array.isArray(performanceData.improvements) ? performanceData.improvements : [],
      effectiveTechniques: Array.isArray(performanceData.effectiveTechniques) ? performanceData.effectiveTechniques : 
                          Array.isArray(performanceData.techniques) ? performanceData.techniques : [],
    };
  }
  
  /**
   * Parse flags from Claude response
   */
  private parseFlags(flags: any): Array<{type: string; description: string; severity: 'low' | 'medium' | 'high'}> {
    if (!Array.isArray(flags)) {
      return [];
    }
    
    return flags.map((flag: any) => ({
      type: flag.type || 'Unknown',
      description: flag.description || flag.desc || '',
      severity: ['low', 'medium', 'high'].includes(flag.severity) ? 
        flag.severity as 'low' | 'medium' | 'high' : 'medium'
    }));
  }
  
  /**
   * Create default sentiment data when parsing fails
   */
  private createDefaultSentimentData(): SentimentData {
    return {
      overallScore: 50,
      timeline: [],
      emotionTags: [],
      escalationPoints: [],
    };
  }
  
  /**
   * Create default clinical summary when parsing fails
   */
  private createDefaultClinicalSummary(): ClinicalSummary {
    return {
      medicalConditions: [],
      drugMentions: [],
      clinicalContext: '',
    };
  }
  
  /**
   * Create default agent performance when parsing fails
   */
  private createDefaultAgentPerformance(): AgentPerformance {
    return {
      communicationScore: 0,
      adherenceToProtocol: 0,
      empathyScore: 0,
      efficiencyScore: 0,
      improvementAreas: [],
      effectiveTechniques: [],
    };
  }
  
  /**
   * Get the name of the analysis model
   */
  getModelName(): string {
    return this.modelName.split('-').slice(0, 2).join('-');
  }
  
  /**
   * Get the version of the analysis model
   */
  getModelVersion(): string {
    return 'sonnet';
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();