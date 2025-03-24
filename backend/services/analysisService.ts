/**
 * Analysis Service
 * Handles call analysis using Claude API
 */
import axios from 'axios';
import { Call } from '../models/callModel';
import { Transcription } from '../models/transcriptionModel';
import { Analysis } from '../models/analysisModel';
import { logger } from '../utils/logger';

export class AnalysisService {
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  private modelVersion: string;
  
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || '';
    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    this.modelName = 'claude-3';
    this.modelVersion = 'opus';
    
    if (!this.apiKey) {
      logger.error('CLAUDE_API_KEY environment variable is not set');
      throw new Error('CLAUDE_API_KEY environment variable is not set');
    }
  }
  
  /**
   * Analyze call transcription using Claude API
   */
  async analyze(transcription: Transcription, call: Call): Promise<Omit<Analysis, 'id' | 'callId' | 'metadata'>> {
    try {
      logger.info(`Analyzing transcription for call ${call.id}`);
      
      // Create the prompt for Claude
      const prompt = this.createAnalysisPrompt(transcription, call);
      
      // Make API request to Claude
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: `${this.modelName}-${this.modelVersion}`,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );
      
      // Parse Claude's response
      const analysisText = response.data.content[0].text;
      const analysis = this.parseAnalysisResponse(analysisText);
      
      return analysis;
    } catch (error) {
      logger.error(`Error analyzing call ${call.id}`, error);
      throw error;
    }
  }
  
  /**
   * Create prompt for Claude to analyze the call
   */
  private createAnalysisPrompt(transcription: Transcription, call: Call): string {
    return `
You are an expert call analyzer for a pharmacy benefits management company. You'll analyze a customer service call transcript to extract insights.

Call Information:
- Call ID: ${call.id}
- Date: ${call.timestamp}
- Duration: ${call.duration} seconds

Please analyze the following call transcript and provide a structured analysis. Focus on these key areas:

1. Sentiment Analysis:
   - Overall sentiment score (0-100)
   - Emotional tone throughout the call
   - Points of escalation or de-escalation

2. Clinical Analysis:
   - Identify any medical conditions mentioned
   - List all drug names mentioned with context
   - Extract clinical context from the discussion

3. Agent Performance:
   - Communication skills assessment
   - Adherence to protocols
   - Empathy and rapport building
   - Efficiency in resolving issues
   - Areas for improvement
   - Effective techniques used

4. Call Summary:
   - Concise summary of the call purpose and outcome
   - Main issues discussed
   - Resolution status

5. Call Disposition:
   - Categorize the call (e.g., medication inquiry, benefits question, complaint)
   - Note if follow-up is required
   - Flag any concerning elements

6. Tagging:
   - Suggest relevant tags for this call

Format your response as a JSON object with these sections. Be thorough but concise.

Transcript:
${transcription.segments.map(segment => `${segment.speaker}: ${segment.text}`).join('\n')}

Your analysis in JSON format:
`;
  }
  
  /**
   * Parse Claude's response into structured analysis data
   */
  private parseAnalysisResponse(analysisText: string): Omit<Analysis, 'id' | 'callId' | 'metadata'> {
    try {
      // Extract the JSON part from Claude's response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from Claude response');
      }
      
      const analysisJson = JSON.parse(jsonMatch[0]);
      
      // Transform the JSON into our Analysis structure
      return {
        sentiment: {
          overallScore: analysisJson.sentimentAnalysis.overallScore,
          timeline: analysisJson.sentimentAnalysis.timeline || [],
          emotionTags: analysisJson.sentimentAnalysis.emotionTags || [],
          escalationPoints: analysisJson.sentimentAnalysis.escalationPoints || [],
        },
        clinicalSummary: {
          medicalConditions: analysisJson.clinicalAnalysis.medicalConditions || [],
          drugMentions: analysisJson.clinicalAnalysis.drugMentions || [],
          clinicalContext: analysisJson.clinicalAnalysis.clinicalContext || '',
        },
        agentPerformance: {
          communicationScore: analysisJson.agentPerformance.communicationScore,
          adherenceToProtocol: analysisJson.agentPerformance.adherenceToProtocol,
          empathyScore: analysisJson.agentPerformance.empathyScore,
          efficiencyScore: analysisJson.agentPerformance.efficiencyScore,
          improvementAreas: analysisJson.agentPerformance.improvementAreas || [],
          effectiveTechniques: analysisJson.agentPerformance.effectiveTechniques || [],
        },
        callSummary: analysisJson.callSummary || '',
        disposition: analysisJson.callDisposition.category || '',
        followUpRequired: !!analysisJson.callDisposition.followUpRequired,
        flags: analysisJson.callDisposition.flags || [],
        tags: analysisJson.tagging || [],
      };
    } catch (error) {
      logger.error('Error parsing Claude response', error);
      throw new Error('Failed to parse Claude analysis response');
    }
  }
  
  /**
   * Get the name of the analysis model
   */
  getModelName(): string {
    return this.modelName;
  }
  
  /**
   * Get the version of the analysis model
   */
  getModelVersion(): string {
    return this.modelVersion;
  }
}