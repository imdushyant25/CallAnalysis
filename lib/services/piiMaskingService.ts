/**
 * PII Masking Service
 * Uses Claude API to identify and mask personally identifiable information in transcripts
 */
import axios from 'axios';

export interface MaskingOptions {
  maskPatientNames?: boolean;
  maskPhoneNumbers?: boolean;
  maskAddresses?: boolean;
  maskEmails?: boolean;
  maskSSN?: boolean;
  maskDOB?: boolean;
  maskAccountNumbers?: boolean;
  maskCreditCardNumbers?: boolean;
  maskMRNs?: boolean;  // Medical Record Numbers
  preserveMedications?: boolean;
}

export interface MaskedTranscript {
  maskedText: string;
  maskedSegments?: {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }[];
  maskingMetadata: {
    timestamp: string;
    modelUsed: string;
    itemsMasked: Record<string, number>;  // e.g., {"PATIENT_NAME": 3, "PHONE": 2}
  };
}

export class PiiMaskingService {
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || '';
    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    this.modelName = 'claude-3-7-sonnet-20250219';
    
    if (!this.apiKey) {
      console.warn('CLAUDE_API_KEY environment variable is not set. PII masking will not work properly.');
    }
  }
  
  /**
   * Mask PII in a transcript using Claude API
   * @param text The text to mask
   * @param options Options specifying which types of PII to mask
   * @returns Promise resolving to masked text
   */
  async maskText(text: string, options: MaskingOptions = {}): Promise<MaskedTranscript> {
    try {
      // Create the prompt for Claude with masking instructions
      const prompt = this.createMaskingPrompt(text, options);
      
      // Make API request to Claude
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.modelName,
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
      const content = response.data.content;
      if (!content || !Array.isArray(content) || content.length === 0 || !content[0].text) {
        throw new Error('Unexpected API response structure');
      }
      
      const maskedText = content[0].text;
      
      // Create metadata for the masking operation
      const maskingMetadata = {
        timestamp: new Date().toISOString(),
        modelUsed: this.modelName,
        itemsMasked: this.countMaskedItems(text, maskedText)
      };
      
      return {
        maskedText,
        maskingMetadata
      };
    } catch (error) {
      console.error('Error masking PII:', error);
      
      // In case of error, return the original text with a warning
      return {
        maskedText: text,
        maskingMetadata: {
          timestamp: new Date().toISOString(),
          modelUsed: 'none - error occurred',
          itemsMasked: {}
        }
      };
    }
  }
  
  /**
   * Mask PII in transcript segments
   * @param segments Transcript segments to mask
   * @param options Options specifying which types of PII to mask
   * @returns Promise resolving to masked segments
   */
  async maskSegments(segments: any[], options: MaskingOptions = {}): Promise<MaskedTranscript> {
    // First, combine all the segments into one text for efficient processing
    const combinedText = segments.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n');
    
    // Mask the combined text
    const { maskedText, maskingMetadata } = await this.maskText(combinedText, options);
    
    // Split the masked text back into segments
    try {
      // This simple approach assumes that Claude preserved the format "Speaker: Text"
      // and the number of segments remains the same
      const maskedTextLines = maskedText.split('\n\n');
      const maskedSegments = segments.map((segment, index) => {
        // If we have a corresponding masked line, extract the text after the speaker prefix
        if (index < maskedTextLines.length) {
          const line = maskedTextLines[index];
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const maskedSegmentText = line.substring(colonIndex + 1).trim();
            return {
              ...segment,
              text: maskedSegmentText
            };
          }
        }
        // If something went wrong, return the original segment
        return segment;
      });
      
      return {
        maskedText,
        maskedSegments,
        maskingMetadata
      };
    } catch (error) {
      console.error('Error splitting masked text into segments:', error);
      
      // If something goes wrong, return the masked text but original segments
      return {
        maskedText,
        maskedSegments: segments,
        maskingMetadata
      };
    }
  }
  
  /**
   * Create prompt for Claude to mask PII
   */
  private createMaskingPrompt(text: string, options: MaskingOptions): string {
    // Default all options to true if not specified
    const {
      maskPatientNames = true,
      maskPhoneNumbers = true,
      maskAddresses = true,
      maskEmails = true,
      maskSSN = true,
      maskDOB = true,
      maskAccountNumbers = true,
      maskCreditCardNumbers = true,
      maskMRNs = true,
      preserveMedications = true
    } = options;
    
    return `
You are a PII (Personally Identifiable Information) detection and masking assistant for healthcare communications.
Your task is to identify and mask sensitive information in pharmacy call transcripts while preserving the context and meaning.

MASKING INSTRUCTIONS:
- Replace the sensitive information with descriptive placeholder tags in [BRACKETS]
- Maintain the original format of the text, including line breaks, spacing, and speaker identifiers
- Do not add any commentary or explanations - just return the masked text
- Use specific tags to indicate the type of information masked (e.g., [PATIENT_NAME], not just [NAME])
- For names that appear multiple times, use consistent identifiers (e.g., [PATIENT_NAME_1], [PATIENT_NAME_2])
- If you're unsure whether something should be masked, err on the side of masking it

TYPES OF INFORMATION TO MASK:
${maskPatientNames ? '- Patient names: Replace with [PATIENT_NAME] or [PATIENT_NAME_1], [PATIENT_NAME_2] for multiple patients' : ''}
${maskPhoneNumbers ? '- Phone numbers: Replace with [PHONE_NUMBER]' : ''}
${maskAddresses ? '- Addresses (full or partial): Replace with [ADDRESS]' : ''}
${maskEmails ? '- Email addresses: Replace with [EMAIL]' : ''}
${maskSSN ? '- Social Security Numbers: Replace with [SSN]' : ''}
${maskDOB ? '- Dates of birth: Replace with [DOB]' : ''}
${maskAccountNumbers ? '- Account numbers, member IDs: Replace with [ACCOUNT_NUMBER]' : ''}
${maskCreditCardNumbers ? '- Credit card numbers: Replace with [CREDIT_CARD]' : ''}
${maskMRNs ? '- Medical Record Numbers: Replace with [MRN]' : ''}
- Any other unique identifiers that could identify a specific patient

${preserveMedications ? 'INFORMATION TO PRESERVE (DO NOT MASK):\n- Medication names and dosages\n- General medical conditions\n- Healthcare organization names (unless uniquely identifying a patient)\n- General ages (e.g., "65-year-old") that don\'t reveal exact DOB' : ''}

TRANSCRIPT TO MASK:
${text}

I need only the masked transcript in return, without any introduction, explanation or additional output.
    `;
  }
  
  /**
   * Count masked items by type
   * A simple implementation that counts placeholder tags
   */
  private countMaskedItems(originalText: string, maskedText: string): Record<string, number> {
    const counts: Record<string, number> = {};
    
    // Regex to find all [TAG] or [TAG_NUMBER] patterns
    const tagRegex = /\[([A-Z_]+)(?:_\d+)?\]/g;
    
    let match;
    while ((match = tagRegex.exec(maskedText)) !== null) {
      const tag = match[1]; // Extract the tag name without brackets
      counts[tag] = (counts[tag] || 0) + 1;
    }
    
    return counts;
  }
}

// Export singleton instance
export const piiMaskingService = new PiiMaskingService();