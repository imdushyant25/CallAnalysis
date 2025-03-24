/**
 * File location: lib/services/audioMetadataService.ts
 * Service for extracting metadata from audio files
 */

/**
 * Metadata extracted from audio files
 */
export interface AudioMetadata {
    duration?: number;         // Duration in seconds
    sampleRate?: number;       // Sample rate in Hz
    bitDepth?: number;         // Bit depth
    channels?: number;         // Number of audio channels
    format?: string;           // Audio format (e.g., "WAV", "MP3")
    recordingDate?: string;    // ISO date string of recording if available
    tags?: Record<string, string>; // Any metadata tags found in the file
    fileSize: number;          // File size in bytes
  }
  
  /**
   * Service for extracting metadata from audio files
   */
  class AudioMetadataService {
    /**
     * Extract metadata from an audio file
     * @param file The audio file to process
     * @returns Promise resolving to the extracted metadata
     */
    async extractMetadata(file: File): Promise<AudioMetadata> {
      if (!file) {
        console.error('No file provided to extractMetadata');
        return {
          fileSize: 0,
          format: 'Unknown'
        };
      }
      
      // Base metadata we can get without parsing
      const baseMetadata: AudioMetadata = {
        fileSize: file.size,
        format: this.getFormatFromMimeType(file.type)
      };
    
      try {
        // Check if file is an audio file
        if (!file.type || !file.type.startsWith('audio/')) {
          console.warn('File is not an audio file:', file.name);
          return baseMetadata;
        }
        
        // Different extraction methods based on the file type
        if (file.type === 'audio/wav' || file.type === 'audio/x-wav') {
          return await this.extractWavMetadata(file, baseMetadata);
        } else if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') {
          return await this.extractMp3Metadata(file, baseMetadata);
        } else {
          // For unsupported formats, return basic metadata
          return baseMetadata;
        }
      } catch (error) {
        console.error('Error extracting audio metadata:', error);
        // Return base metadata if extraction fails
        return baseMetadata;
      }
    }
  
    /**
     * Extract metadata from a WAV file
     */
    private async extractWavMetadata(file: File, baseMetadata: AudioMetadata): Promise<AudioMetadata> {
      return new Promise((resolve, reject) => {
        // Create a FileReader to read the file as an ArrayBuffer
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              throw new Error('Failed to read file');
            }
            
            const dataView = new DataView(arrayBuffer);
            
            // Check for "RIFF" identifier
            const riff = this.readFourCC(dataView, 0);
            if (riff !== 'RIFF') {
              throw new Error('Not a valid WAV file: missing RIFF identifier');
            }
            
            // Check for "WAVE" format
            const wave = this.readFourCC(dataView, 8);
            if (wave !== 'WAVE') {
              throw new Error('Not a valid WAV file: missing WAVE format');
            }
            
            // Find the "fmt " chunk
            let offset = 12; // Start after RIFF header and WAVE identifier
            let fmtChunkSize = 0;
            
            while (offset < dataView.byteLength) {
              const chunkId = this.readFourCC(dataView, offset);
              const chunkSize = dataView.getUint32(offset + 4, true);
              
              if (chunkId === 'fmt ') {
                // Found the format chunk
                fmtChunkSize = chunkSize;
                break;
              }
              
              // Move to the next chunk
              offset += 8 + chunkSize;
              
              // Ensure word alignment
              if (chunkSize % 2 !== 0) {
                offset += 1;
              }
            }
            
            if (fmtChunkSize === 0) {
              throw new Error('Invalid WAV file: missing format chunk');
            }
            
            // Parse the format chunk
            offset += 8; // Move past the chunk ID and size
            
            // Audio format (1 = PCM)
            const audioFormat = dataView.getUint16(offset, true);
            
            // Number of channels
            const numChannels = dataView.getUint16(offset + 2, true);
            
            // Sample rate
            const sampleRate = dataView.getUint32(offset + 4, true);
            
            // Calculate bit depth from blockalign / numchannels
            const blockAlign = dataView.getUint16(offset + 12, true);
            const bitDepth = (blockAlign / numChannels) * 8;
            
            // Find data chunk to determine actual audio data size for duration calculation
            let dataSize = 0;
            offset = 12; // Reset to after RIFF and WAVE
            
            while (offset < dataView.byteLength) {
              const chunkId = this.readFourCC(dataView, offset);
              const chunkSize = dataView.getUint32(offset + 4, true);
              
              if (chunkId === 'data') {
                dataSize = chunkSize;
                break;
              }
              
              // Move to the next chunk
              offset += 8 + chunkSize;
              
              // Ensure word alignment
              if (chunkSize % 2 !== 0) {
                offset += 1;
              }
            }
            
            // Calculate duration in seconds
            let duration = 0;
            if (dataSize > 0 && sampleRate > 0 && bitDepth > 0 && numChannels > 0) {
              // Duration = data size / (sample rate * bit depth/8 * channels)
              duration = dataSize / (sampleRate * (bitDepth / 8) * numChannels);
            }
            
            // Build the metadata object
            const metadata: AudioMetadata = {
              ...baseMetadata,
              duration,
              sampleRate,
              bitDepth,
              channels: numChannels,
              format: 'WAV',
              tags: {}
            };
            
            // Check for additional metadata chunks like LIST/INFO
            offset = 12; // Reset offset
            while (offset < dataView.byteLength) {
              const chunkId = this.readFourCC(dataView, offset);
              const chunkSize = dataView.getUint32(offset + 4, true);
              
              if (chunkId === 'LIST') {
                // Check if it's an INFO list
                const listType = this.readFourCC(dataView, offset + 8);
                if (listType === 'INFO') {
                  // Parse INFO tags
                  let infoOffset = offset + 12;
                  const endOffset = offset + 8 + chunkSize;
                  
                  while (infoOffset < endOffset) {
                    const tagId = this.readFourCC(dataView, infoOffset);
                    const tagSize = dataView.getUint32(infoOffset + 4, true);
                    
                    if (tagSize > 0) {
                      // Extract the tag value as a string
                      const tagValue = this.extractString(dataView, infoOffset + 8, tagSize);
                      
                      // Store in tags
                      metadata.tags![tagId] = tagValue;
                      
                      // If it's a date tag, store it in recordingDate
                      if (tagId === 'ICRD') {
                        metadata.recordingDate = tagValue;
                      }
                    }
                    
                    // Move to the next tag
                    infoOffset += 8 + tagSize;
                    
                    // Ensure word alignment
                    if (tagSize % 2 !== 0) {
                      infoOffset += 1;
                    }
                  }
                }
              }
              
              // Move to the next chunk
              offset += 8 + chunkSize;
              
              // Ensure word alignment
              if (chunkSize % 2 !== 0) {
                offset += 1;
              }
            }
            
            resolve(metadata);
          } catch (error) {
            console.error('Error parsing WAV metadata:', error);
            resolve(baseMetadata);
          }
        };
        
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          resolve(baseMetadata);
        };
        
        // Read the first 64KB of the file, which should contain all headers
        const blob = file.slice(0, 65536);
        reader.readAsArrayBuffer(blob);
      });
    }
  
    /**
     * Extract metadata from an MP3 file
     * This is a simplified implementation as MP3 metadata is more complex
     */
    private async extractMp3Metadata(file: File, baseMetadata: AudioMetadata): Promise<AudioMetadata> {
      // In a real implementation, this would parse ID3 tags
      // For now, return a placeholder with basic file information
      return {
        ...baseMetadata,
        format: 'MP3',
        tags: {}
      };
    }
  
    /**
     * Read a four-character code from a DataView at the specified offset
     */
    private readFourCC(dataView: DataView, offset: number): string {
      const chars: number[] = [];
      for (let i = 0; i < 4; i++) {
        chars.push(dataView.getUint8(offset + i));
      }
      return String.fromCharCode(...chars);
    }
  
    /**
     * Extract a string from a DataView at the specified offset and length
     */
    private extractString(dataView: DataView, offset: number, length: number): string {
      const chars: number[] = [];
      for (let i = 0; i < length; i++) {
        const char = dataView.getUint8(offset + i);
        if (char === 0) break; // Stop at null terminator
        chars.push(char);
      }
      return String.fromCharCode(...chars).trim();
    }
  
    /**
     * Get the audio format from MIME type
     */
    private getFormatFromMimeType(mimeType: string | undefined): string {
      // Handle undefined or empty mimeType
      if (!mimeType) {
        return 'Unknown';
      }
      
      switch (mimeType) {
        case 'audio/wav':
        case 'audio/x-wav':
        case 'audio/wave':
          return 'WAV';
        case 'audio/mpeg':
        case 'audio/mp3':
          return 'MP3';
        case 'audio/aac':
        case 'audio/x-m4a':
          return 'AAC';
        case 'audio/ogg':
          return 'OGG';
        default:
          // Safely extract the format part after the "/"
          const parts = mimeType.split('/');
          if (parts.length > 1 && parts[1]) {
            return parts[1].toUpperCase();
          }
          return 'Unknown';
      }
    }
  }
  
  // Export a singleton instance
  export const audioMetadataService = new AudioMetadataService();