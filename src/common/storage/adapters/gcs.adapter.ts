import {
  StorageAdapter,
  UploadOptions,
  StreamUploadOptions,
  StreamDownloadOptions,
} from '../storage.types';
import { Storage } from '@google-cloud/storage';

export class GCSStorageAdapter implements StorageAdapter {
  private readonly bucketName: string;
  private readonly storage: Storage;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET || '';
    const projectId = process.env.GCP_PROJECT_ID;
    const keyFile =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_APPLICATION_CREDENTIALS;
    this.storage = new Storage({ projectId, keyFilename: keyFile });
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: UploadOptions
  ): Promise<{ key: string }> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const buf =
      typeof data === 'string'
        ? Buffer.from(data)
        : Buffer.isBuffer(data)
          ? data
          : Buffer.from(data);
    await file.save(buf, { contentType: options?.contentType, resumable: false });
    return { key };
  }

  async download(key: string): Promise<Buffer> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const [buf] = await file.download();
    return buf;
  }

  async delete(key: string): Promise<void> {
    const file = this.storage.bucket(this.bucketName).file(key);
    await file.delete({ ignoreNotFound: true } as any);
  }

  async exists(key: string): Promise<boolean> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const [exists] = await file.exists();
    return !!exists;
  }

  async list(prefix?: string): Promise<string[]> {
    const [files] = await this.storage.bucket(this.bucketName).getFiles({ prefix });
    return files.map((f) => f.name).filter(Boolean) as string[];
  }

  async getSignedUrl(
    key: string,
    operation: 'get' | 'put' | 'delete',
    expiresInSeconds = 900
  ): Promise<string> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const action = operation === 'get' ? 'read' : operation === 'put' ? 'write' : 'delete';
    const [url] = await file.getSignedUrl({
      action: action as any,
      expires: Date.now() + Math.max(1, Math.min(7 * 24 * 3600, expiresInSeconds)) * 1000,
      contentType: operation === 'put' ? 'application/octet-stream' : undefined,
    });
    return url;
  }

  async uploadStream(
    key: string,
    input: NodeJS.ReadableStream,
    options?: StreamUploadOptions
  ): Promise<{ key: string }> {
    const file = this.storage.bucket(this.bucketName).file(key);
    let stream: NodeJS.ReadableStream = input;
    if (options?.transforms?.length) {
      for (const t of options.transforms) stream = stream.pipe(t);
    }
    const write = file.createWriteStream({ contentType: options?.contentType, resumable: true });
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(write)
        .on('error', reject)
        .on('finish', () => resolve());
    });
    return { key };
  }

  async downloadStream(
    key: string,
    options?: StreamDownloadOptions
  ): Promise<NodeJS.ReadableStream> {
    const file = this.storage.bucket(this.bucketName).file(key);
    let read = file.createReadStream();
    if (options?.transforms?.length) {
      for (const t of options.transforms) read = read.pipe(t as any);
    }
    return read as unknown as NodeJS.ReadableStream;
  }
}
