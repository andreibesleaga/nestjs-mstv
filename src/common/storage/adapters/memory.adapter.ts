import {
  StorageAdapter,
  UploadOptions,
  StreamUploadOptions,
  StreamDownloadOptions,
} from '../storage.types';
import { PassThrough, Readable, pipeline as nodePipeline } from 'stream';
import { promisify } from 'util';
const pipeline = promisify(nodePipeline);

export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, Buffer>();

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    _options?: UploadOptions
  ): Promise<{ key: string }> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    this.store.set(key, buf);
    return { key };
  }
  async download(key: string): Promise<Buffer> {
    const v = this.store.get(key);
    if (!v) throw new Error('NotFound');
    return Buffer.from(v);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
  async list(prefix = ''): Promise<string[]> {
    return [...this.store.keys()].filter((k) => k.startsWith(prefix));
  }
  async getSignedUrl(
    key: string,
    operation: 'get' | 'put' | 'delete',
    _expiresInSeconds = 900
  ): Promise<string> {
    return `memory://${operation}/${encodeURIComponent(key)}`;
  }

  async uploadStream(
    key: string,
    input: NodeJS.ReadableStream,
    options?: StreamUploadOptions
  ): Promise<{ key: string }> {
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];
    // Build pipeline: input -> transforms... -> passthrough
    const stages: NodeJS.ReadableStream[] = [input as NodeJS.ReadableStream];
    if (options?.transforms?.length) stages.push(...options.transforms);
    stages.push(passthrough);
    await pipeline(stages[0] as any, ...(stages.slice(1) as any));
    await new Promise<void>((resolve, reject) => {
      passthrough
        .on('data', (d: Buffer) => chunks.push(d))
        .on('error', reject)
        .on('end', () => resolve());
    });
    this.store.set(key, Buffer.concat(chunks));
    return { key };
  }

  async downloadStream(
    key: string,
    options?: StreamDownloadOptions
  ): Promise<NodeJS.ReadableStream> {
    const buf = await this.download(key);
    const src = Readable.from(buf);
    if (options?.transforms?.length) {
      // Chain transforms and return the final readable
      return options.transforms.reduce(
        (prev, t) => prev.pipe(t),
        src as unknown as NodeJS.ReadableStream
      );
    }
    return src as unknown as NodeJS.ReadableStream;
  }
}
