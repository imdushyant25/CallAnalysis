/**
 * File location: lib/services/uploadService.ts
 * Service for handling file uploads to S3 with improved error handling
 */

/**
 * Metadata for uploaded call recordings
 */
export interface CallMetadata {
  agentId: string;
  callDirection: 'inbound' | 'outbound';
  callerId?: string;
  callStartTime?: string;
}

/**
 * Response from the API when getting a pre-signed URL
 */
interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
}

/**
 * Upload status information
 */
export interface UploadItem {
  id: string;
  filename: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  s3Key?: string;
  callId?: string;
  error?: string;
  metadata?: CallMetadata;
}

/**
 * Service for handling file uploads to S3
 */
class UploadService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  }

  /**
   * Upload a single file with metadata to S3
   */
  async uploadFile(
    file: File,
    metadata: CallMetadata,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed') => void
  ): Promise<{ callId: string; s3Key: string }> {
    try {
      // Validate inputs
      if (!file) {
        throw new Error('File is required');
      }

      // Ensure metadata is valid
      const validMetadata: CallMetadata = {
        agentId: metadata?.agentId || 'unassigned',
        callDirection: metadata?.callDirection || 'inbound',
        callerId: metadata?.callerId || '',
        callStartTime: metadata?.callStartTime || new Date().toISOString(),
      };

      // Update status to pending
      onStatusChange?.('pending');

      // Step 1: Get a pre-signed URL from our API
      const presignedUrlResponse = await this.getPresignedUploadUrl(file.name, file.type);
      const { uploadUrl, key } = presignedUrlResponse;

      // Step 2: Upload the file directly to S3 with the pre-signed URL
      onStatusChange?.('uploading');
      await this.uploadToS3(uploadUrl, file, onProgress);

      // Step 3: Notify the backend that the upload is complete and processing can begin
      onStatusChange?.('processing');
      const callRecord = await this.notifyUploadComplete(key, validMetadata);

      // Update status to completed
      onStatusChange?.('completed');

      return {
        callId: callRecord.id,
        s3Key: key
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      onStatusChange?.('failed');
      throw error;
    }
  }

  /**
   * Upload multiple files with metadata
   * @param files - The files to upload
   * @param metadataList - Metadata for each file
   * @param onProgress - Optional callback for progress updates
   * @param onStatusChange - Optional callback for status changes
   */
  async uploadMultipleFiles(
    files: File[],
    metadataList: CallMetadata[],
    onProgress?: (fileIndex: number, progress: number) => void,
    onStatusChange?: (fileIndex: number, status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed') => void
  ): Promise<{ callId: string; s3Key: string }[]> {
    const results = [];

    // Ensure metadataList is valid
    const validatedMetadataList = files.map((_, index) => {
      // Use the provided metadata if available, otherwise create default metadata
      return metadataList && metadataList[index] ? metadataList[index] : {
        agentId: 'unassigned',
        callDirection: 'inbound' as 'inbound' | 'outbound',
        callerId: '',
        callStartTime: new Date().toISOString()
      };
    });

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(
          files[i],
          validatedMetadataList[i],
          (progress) => onProgress?.(i, progress),
          (status) => onStatusChange?.(i, status)
        );
        results.push(result);
      } catch (error) {
        console.error(`Error uploading file ${i}:`, error);
        // Continue with other files even if one fails
      }
    }

    return results;
  }

  /**
   * Get a pre-signed URL for uploading a file to S3
   */
  private async getPresignedUploadUrl(
    filename: string,
    fileType: string
  ): Promise<PresignedUrlResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/upload/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, fileType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to get upload URL: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response
      if (!data.uploadUrl || !data.key) {
        throw new Error('Invalid response from server: missing uploadUrl or key');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      throw new Error(`Failed to get upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file to S3 using a pre-signed URL
   */
  private async uploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress?.(percentComplete);
        }
      };

      // Handle success and errors
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status code: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload request timed out'));
      };

      // Open connection and set headers
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      // Send the file
      xhr.send(file);
    });
  }

  /**
   * Notify the backend that upload is complete and processing can begin
   */
  private async notifyUploadComplete(
    s3Key: string,
    metadata: CallMetadata
  ): Promise<{ id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          s3Key,
          metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to complete upload process: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response
      if (!data.id) {
        throw new Error('Invalid response from server: missing call ID');
      }
      
      return data;
    } catch (error) {
      console.error('Error notifying upload complete:', error);
      throw new Error(`Failed to complete upload process: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the status of an upload by call ID
   */
  async getUploadStatus(callId: string): Promise<UploadItem> {
    try {
      const response = await fetch(`${this.baseUrl}/upload/status/${callId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to get upload status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting upload status:', error);
      throw new Error(`Failed to get upload status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retry a failed upload
   * Note: This would require storing the original file, which is not currently implemented
   * This is a placeholder for future implementation
   */
  async retryUpload(uploadId: string): Promise<void> {
    // This would be implemented in a real application
    throw new Error('Retry functionality not yet implemented');
  }

  /**
   * Cancel an in-progress upload
   * Note: This would require accessing the XHR object, which would need to be tracked
   * This is a placeholder for future implementation
   */
  async cancelUpload(uploadId: string): Promise<void> {
    // This would be implemented in a real application
    throw new Error('Cancel functionality not yet implemented');
  }
}

// Export a singleton instance
export const uploadService = new UploadService();