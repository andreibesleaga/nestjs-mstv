import {
  StorageAdapter,
  UploadOptions,
  StreamUploadOptions,
  StreamDownloadOptions,
} from '../storage.types';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageAdapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    const credentials =
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined;
    this.client = new S3Client({ region, endpoint, forcePathStyle, credentials });
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: UploadOptions
  ): Promise<{ key: string }> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType,
    });
    await this.client.send(cmd);
    return { key };
  }

  async download(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res: any = await this.client.send(cmd);
    // AWS SDK v3 streams: Body may have transformToByteArray or be a Readable
    if (res.Body?.transformToByteArray) {
      const arr = await res.Body.transformToByteArray();
      return Buffer.from(arr);
    }
    // Fallback: aggregate stream
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      res.Body.on('data', (d: Buffer) => chunks.push(d))
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    const cmd = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(cmd);
  }

  async exists(key: string): Promise<boolean> {
    const cmd = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
    try {
      await this.client.send(cmd);
      return true;
    } catch (err: any) {
      if (
        err?.$metadata?.httpStatusCode === 404 ||
        err?.name === 'NotFound' ||
        err?.Code === 'NotFound'
      ) {
        return false;
      }
      return false; // conservative
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const cmd = new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix });
    const res = await this.client.send(cmd);
    return (res.Contents || []).map((o) => o.Key!).filter(Boolean) as string[];
  }

  async getSignedUrl(
    key: string,
    operation: 'get' | 'put' | 'delete',
    expiresInSeconds = 900
  ): Promise<string> {
    const expiresIn = Math.max(1, Math.min(7 * 24 * 3600, expiresInSeconds));
    const command =
      operation === 'get'
        ? new GetObjectCommand({ Bucket: this.bucket, Key: key })
        : operation === 'put'
          ? new PutObjectCommand({ Bucket: this.bucket, Key: key })
          : new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.client, command as any, { expiresIn });
  }

  // Streamed upload using PutObject with Body as stream; applies optional transforms
  async uploadStream(
    key: string,
    input: NodeJS.ReadableStream,
    options?: StreamUploadOptions
  ): Promise<{ key: string }> {
    let body: NodeJS.ReadableStream = input;
    if (options?.transforms?.length) {
      for (const t of options.transforms) {
        body = body.pipe(t);
      }
    }
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body as any,
      ContentType: options?.contentType,
      // ContentLength can help but is optional for streaming
      // (not all clients require it)
    } as any);
    await this.client.send(cmd);
    return { key };
  }

  // Streamed download returning a readable; applies optional transform pipeline
  async downloadStream(
    key: string,
    options?: StreamDownloadOptions
  ): Promise<NodeJS.ReadableStream> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res: any = await this.client.send(cmd);
    let stream: NodeJS.ReadableStream = res.Body as NodeJS.ReadableStream;
    if (options?.transforms?.length) {
      for (const t of options.transforms) {
        stream = stream.pipe(t as any);
      }
    }
    return stream;
  }
}
