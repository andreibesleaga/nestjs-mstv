import { Injectable, Optional } from '@nestjs/common';
import {
  StorageAdapter,
  UploadOptions,
  StorageProvider,
  StreamUploadOptions,
  StreamDownloadOptions,
} from './storage.types';

@Injectable()
export class StorageService {
  constructor(@Optional() private readonly adapter?: StorageAdapter) {}

  static resolveProvider(): StorageProvider {
    const p = (process.env.STORAGE_PROVIDER || 'none').toLowerCase();
    if (p === 'aws' || p === 'azure' || p === 'gcp') return p;
    return 'none';
  }

  ensureAdapter() {
    if (!this.adapter) throw new Error('Storage adapter not configured');
    return this.adapter;
  }

  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions) {
    return this.ensureAdapter().upload(key, data, options);
  }
  async download(key: string) {
    return this.ensureAdapter().download(key);
  }
  async delete(key: string) {
    return this.ensureAdapter().delete(key);
  }
  async exists(key: string) {
    return this.ensureAdapter().exists(key);
  }
  async list(prefix?: string) {
    return this.ensureAdapter().list(prefix);
  }
  async getSignedUrl(key: string, operation: 'get' | 'put' | 'delete', expiresInSeconds?: number) {
    return this.ensureAdapter().getSignedUrl(key, operation, expiresInSeconds);
  }

  // Stream helpers - fallback to buffer methods if adapter lacks streaming support
  async uploadStream(key: string, input: NodeJS.ReadableStream, options?: StreamUploadOptions) {
    const adapter = this.ensureAdapter();
    if (adapter.uploadStream) {
      return adapter.uploadStream(key, input, options);
    }
    // Fallback: buffer the stream (not recommended for very large files)
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      input
        .on('data', (d: Buffer) => chunks.push(d))
        .on('error', reject)
        .on('end', () => resolve());
    });
    return adapter.upload(key, Buffer.concat(chunks), options);
  }

  async downloadStream(key: string, options?: StreamDownloadOptions) {
    const adapter = this.ensureAdapter();
    if (adapter.downloadStream) {
      return adapter.downloadStream(key, options);
    }
    // Fallback: create a Readable from buffered content
    const buf = await adapter.download(key);
    const { Readable } = await import('stream');
    const readable = new Readable({ read() {} });
    readable.push(buf);
    readable.push(null);
    return readable as NodeJS.ReadableStream;
  }
}
