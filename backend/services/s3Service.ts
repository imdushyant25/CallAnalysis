/**
 * S3 Service
 * Handles interactions with AWS S3 for file storage and retrieval
 */
import { S3 } from 'aws-sdk';
import { logger } from '../utils/logger';

export class S3Service {
  private s3: S3;
  private bucket: string;
  
  constructor() {
    this.s3 = new S3();
    this.bucket = process.env.S3_BUCKET || '';
    
    if (!this.bucket) {
      logger.error('S3_BUCKET environment variable is not set');
      throw new Error('S3_BUCKET environment variable is not set');
    }
  }
  
  /**
   * Get a pre-signed URL for uploading a file to S3
   */
  async getSignedUploadUrl(key: string, contentType: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Expires: 3600, // URL expires in 1 hour
    };
    
    try {
      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);
      return uploadUrl;
    } catch (error) {
      logger.error(`Error generating signed upload URL for key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Get a pre-signed URL for downloading a file from S3
   */
  async getSignedDownloadUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: 3600, // URL expires in 1 hour
    };
    
    try {
      const downloadUrl = await this.s3.getSignedUrlPromise('getObject', params);
      return downloadUrl;
    } catch (error) {
      logger.error(`Error generating signed download URL for key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Get an object from S3
   */
  async getObject(bucket: string, key: string): Promise<Buffer> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    
    try {
      const data = await this.s3.getObject(params).promise();
      return data.Body as Buffer;
    } catch (error) {
      logger.error(`Error getting object from S3 with key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Get metadata for an object in S3
   */
  async getObjectMetadata(bucket: string, key: string): Promise<any> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    
    try {
      const data = await this.s3.headObject(params).promise();
      return data.Metadata || {};
    } catch (error) {
      logger.error(`Error getting object metadata for key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Upload an object to S3
   */
  async uploadObject(key: string, body: Buffer, contentType: string, metadata?: Record<string, string>): Promise<void> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    };
    
    try {
      await this.s3.putObject(params).promise();
    } catch (error) {
      logger.error(`Error uploading object to S3 with key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Check if an object exists in S3
   */
  async objectExists(key: string): Promise<boolean> {
    const params = {
      Bucket: this.bucket,
      Key: key,
    };
    
    try {
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if ((error as any).code === 'NotFound') {
        return false;
      }
      
      logger.error(`Error checking if object exists with key ${key}`, error);
      throw error;
    }
  }
  
  /**
   * List objects in S3 with a given prefix
   */
  async listObjects(prefix: string): Promise<string[]> {
    const params = {
      Bucket: this.bucket,
      Prefix: prefix,
    };
    
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      return (data.Contents || []).map(object => object.Key || '');
    } catch (error) {
      logger.error(`Error listing objects with prefix ${prefix}`, error);
      throw error;
    }
  }
}