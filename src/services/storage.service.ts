/**
 * Storage Service - MinIO/S3 Compatible Object Storage
 *
 * On-premise alternative to Supabase Storage
 * Supports MinIO, AWS S3, and any S3-compatible storage
 */

import { Client } from "minio";
import { Readable } from "stream";
import crypto from "crypto";
import path from "path";

export interface StorageConfig {
  endPoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
}

export interface UploadResult {
  bucket: string;
  key: string;
  etag: string;
  url: string;
  size: number;
  contentType: string;
}

export interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export class StorageService {
  private client: Client;
  private buckets: {
    documents: string;
    images: string;
  };

  constructor(config?: Partial<StorageConfig>) {
    const storageConfig: StorageConfig = {
      endPoint:
        config?.endPoint ?? process.env["MINIO_ENDPOINT"] ?? "localhost",
      port: config?.port ?? parseInt(process.env["MINIO_PORT"] ?? "9000", 10),
      accessKey:
        config?.accessKey ?? process.env["MINIO_ACCESS_KEY"] ?? "minioadmin",
      secretKey:
        config?.secretKey ?? process.env["MINIO_SECRET_KEY"] ?? "minioadmin",
      useSSL: config?.useSSL ?? process.env["MINIO_USE_SSL"] === "true",
    };

    this.client = new Client(storageConfig);

    this.buckets = {
      documents: process.env["MINIO_BUCKET_DOCUMENTS"] ?? "documents",
      images: process.env["MINIO_BUCKET_IMAGES"] ?? "images",
    };
  }

  /**
   * Initialize storage - create buckets if they don't exist
   */
  async initialize(): Promise<void> {
    for (const bucket of Object.values(this.buckets)) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        console.log(`[Storage] Created bucket: ${bucket}`);
      }
    }
  }

  /**
   * Upload a file from buffer
   */
  async uploadBuffer(
    bucket: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
    options?: { preserveKey?: boolean },
  ): Promise<UploadResult> {
    const key = options?.preserveKey ? fileName : this.generateKey(fileName);

    await this.client.putObject(bucket, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });

    const stat = await this.client.statObject(bucket, key);

    return {
      bucket,
      key,
      etag: stat.etag,
      url: this.getPublicUrl(bucket, key),
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Upload a file from stream
   */
  async uploadStream(
    bucket: string,
    fileName: string,
    stream: Readable,
    size: number,
    contentType: string,
  ): Promise<UploadResult> {
    const key = this.generateKey(fileName);

    await this.client.putObject(bucket, key, stream, size, {
      "Content-Type": contentType,
    });

    const stat = await this.client.statObject(bucket, key);

    return {
      bucket,
      key,
      etag: stat.etag,
      url: this.getPublicUrl(bucket, key),
      size,
      contentType,
    };
  }

  /**
   * Download a file as buffer
   */
  async downloadBuffer(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  /**
   * Download a file as stream
   */
  async downloadStream(bucket: string, key: string): Promise<Readable> {
    return this.client.getObject(bucket, key);
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: string, keys: string[]): Promise<void> {
    await this.client.removeObjects(bucket, keys);
  }

  /**
   * Check if file exists
   */
  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(bucket: string, key: string): Promise<FileInfo> {
    const stat = await this.client.statObject(bucket, key);
    return {
      name: key,
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag,
      contentType: stat.metaData?.["content-type"],
    };
  }

  /**
   * List files in bucket (with optional prefix)
   */
  async listFiles(bucket: string, prefix?: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const stream = this.client.listObjectsV2(bucket, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on("data", (obj) => {
        if (obj.name) {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
        }
      });
      stream.on("end", () => resolve(files));
      stream.on("error", reject);
    });
  }

  /**
   * Generate a presigned URL for temporary access
   */
  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expiresInSeconds);
  }

  /**
   * Generate a presigned URL for upload
   */
  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.client.presignedPutObject(bucket, key, expiresInSeconds);
  }

  /**
   * Copy file within or between buckets
   */
  async copyFile(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<void> {
    await this.client.copyObject(
      destBucket,
      destKey,
      `/${sourceBucket}/${sourceKey}`,
    );
  }

  /**
   * Get bucket names
   */
  getBuckets() {
    return this.buckets;
  }

  /**
   * Generate unique key with timestamp and random suffix
   */
  private generateKey(fileName: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, "_");

    return `${timestamp}-${random}-${sanitizedName}${ext}`;
  }

  /**
   * Get public URL (requires bucket policy to be public)
   */
  private getPublicUrl(bucket: string, key: string): string {
    const endpoint = process.env["MINIO_ENDPOINT"] ?? "localhost";
    const port = process.env["MINIO_PORT"] ?? "9000";
    const useSSL = process.env["MINIO_USE_SSL"] === "true";
    const protocol = useSSL ? "https" : "http";

    return `${protocol}://${endpoint}:${port}/${bucket}/${key}`;
  }
}

/**
 * Singleton instance
 */
let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageInstance) {
    storageInstance = new StorageService();
  }
  return storageInstance;
}

export async function initializeStorage(): Promise<void> {
  const storage = getStorageService();
  await storage.initialize();
}
