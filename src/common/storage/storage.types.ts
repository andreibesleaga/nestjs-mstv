export type StorageProvider = 'aws' | 'azure' | 'gcp' | 'none';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface StreamUploadOptions extends UploadOptions {
  // Optional transform pipeline to apply before writing to the backend
  transforms?: NodeJS.ReadWriteStream[];
  // Optional content length when known (helps some providers like S3)
  contentLength?: number;
}

export interface StreamDownloadOptions {
  // Optional transform pipeline to apply after reading from the backend
  transforms?: NodeJS.ReadWriteStream[];
}

export interface StorageAdapter {
  upload(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: UploadOptions
  ): Promise<{ key: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  getSignedUrl(
    key: string,
    operation: 'get' | 'put' | 'delete',
    expiresInSeconds?: number
  ): Promise<string>;
  // Stream APIs (optional but recommended for large files)
  uploadStream?(
    key: string,
    input: NodeJS.ReadableStream,
    options?: StreamUploadOptions
  ): Promise<{ key: string }>;
  downloadStream?(key: string, options?: StreamDownloadOptions): Promise<NodeJS.ReadableStream>;
}
